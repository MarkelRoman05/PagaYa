import fs from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { createClient } from "@supabase/supabase-js";

const DISPATCH_BATCH_SIZE = Number(process.env.PUSH_DISPATCH_BATCH_SIZE ?? "100");
const WATCH_MODE = process.argv.includes("--watch") || process.env.PUSH_WATCH === "true";
const WATCH_POLL_INTERVAL_MS = Number(process.env.PUSH_WATCH_POLL_INTERVAL_MS ?? "3000");
const processingNotificationIds = new Set();
let batchInFlight = false;

function getFirebaseServiceAccount() {
  const pathFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (pathFromEnv && fs.existsSync(pathFromEnv)) {
    return JSON.parse(fs.readFileSync(pathFromEnv, "utf8"));
  }

  const jsonFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (jsonFromEnv) {
    return JSON.parse(jsonFromEnv);
  }

  const base64FromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;

  if (base64FromEnv) {
    return JSON.parse(Buffer.from(base64FromEnv, "base64").toString("utf8"));
  }

  throw new Error("Faltan credenciales Firebase. Define FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_JSON_BASE64.");
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Falta SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL).");
  }

  if (!serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function compactError(error) {
  if (!error) {
    return "unknown";
  }

  const maybeCode = typeof error.code === "string" ? error.code : "";
  const maybeMessage = typeof error.message === "string" ? error.message : String(error);
  return [maybeCode, maybeMessage].filter(Boolean).join(": ").slice(0, 280);
}

async function markAsDelivered(supabase, notificationId) {
  const { error } = await supabase
    .from("user_notifications")
    .update({
      push_sent_at: new Date().toISOString(),
      push_last_error: null,
      push_attempts: 1,
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`No se pudo marcar la notificacion ${notificationId} como enviada: ${error.message}`);
  }
}

async function markAsFailed(supabase, notificationId, reason) {
  const { error } = await supabase
    .from("user_notifications")
    .update({
      push_attempts: 1,
      push_last_error: reason,
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`No se pudo marcar error de la notificacion ${notificationId}: ${error.message}`);
  }
}

async function markTokensInactive(supabase, tokens) {
  if (tokens.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("user_push_tokens")
    .update({
      is_active: false,
      last_seen_at: new Date().toISOString(),
    })
    .in("token", tokens);

  if (error) {
    throw new Error(`No se pudieron desactivar tokens invalidos: ${error.message}`);
  }
}

async function dispatchNotification(supabase, row) {
  if (!row.push_enabled) {
    return { sent: false, reason: "push_disabled" };
  }

  const { data: tokenRows, error: tokenError } = await supabase
    .from("user_push_tokens")
    .select("token")
    .eq("user_id", row.user_id)
    .eq("platform", "android")
    .eq("is_active", true);

  if (tokenError) {
    throw new Error(`No se pudieron obtener tokens de ${row.user_id}: ${tokenError.message}`);
  }

  const tokens = (tokenRows ?? [])
    .map((tokenRow) => tokenRow.token)
    .filter((token) => typeof token === "string" && token.length > 0);

  if (tokens.length === 0) {
    await markAsFailed(supabase, row.id, "NO_ACTIVE_ANDROID_TOKENS");
    return { sent: false, reason: "no_tokens" };
  }

  const payload = {
    notification: {
      title: row.title,
      body: row.message,
    },
    data: {
      notification_id: row.id,
      type: row.type,
    },
    android: {
      priority: "high",
      notification: {
        channelId: "default",
        sound: "default",
      },
    },
    tokens,
  };

  const result = await getMessaging().sendEachForMulticast(payload);
  const invalidTokens = [];

  result.responses.forEach((response, index) => {
    if (!response.success) {
      const code = response.error?.code ?? "";
      if (
        code.includes("registration-token-not-registered")
        || code.includes("invalid-registration-token")
      ) {
        invalidTokens.push(tokens[index]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    await markTokensInactive(supabase, invalidTokens);
  }

  if (result.successCount > 0) {
    await markAsDelivered(supabase, row.id);
    return { sent: true, successCount: result.successCount, failureCount: result.failureCount };
  }

  const firstError = compactError(result.responses[0]?.error);
  await markAsFailed(supabase, row.id, `FCM_FAILED:${firstError}`);
  return { sent: false, reason: firstError };
}

async function processOneNotification(supabase, row, source) {
  if (!row?.id || processingNotificationIds.has(row.id)) {
    return;
  }

  processingNotificationIds.add(row.id);

  try {
    const result = await dispatchNotification(supabase, row);
    if (result.sent) {
      console.log(`[${source}] push enviada para ${row.id}`);
    } else {
      console.log(`[${source}] push no enviada para ${row.id}: ${result.reason}`);
    }
  } catch (error) {
    const reason = compactError(error);
    await markAsFailed(supabase, row.id, `DISPATCH_ERROR:${reason}`);
    console.error(`[${source}] fallo en notificacion ${row.id}: ${reason}`);
  } finally {
    processingNotificationIds.delete(row.id);
  }
}

async function processPendingNotifications(supabase) {
  if (batchInFlight) {
    return;
  }

  batchInFlight = true;

  const { data: pendingRows, error: pendingError } = await supabase
    .from("user_notifications")
    .select("id,user_id,type,title,message,push_enabled")
    .eq("push_enabled", true)
    .is("push_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(DISPATCH_BATCH_SIZE);

  if (pendingError) {
    batchInFlight = false;
    throw new Error(`No se pudieron cargar notificaciones pendientes: ${pendingError.message}`);
  }

  if (!pendingRows || pendingRows.length === 0) {
    console.log("No hay notificaciones push pendientes.");
    batchInFlight = false;
    return;
  }

  for (const row of pendingRows) {
    await processOneNotification(supabase, row, "batch");
  }

  console.log(`Push dispatch batch finalizado. Total=${pendingRows.length}`);
  batchInFlight = false;
}

async function startRealtimeWatcher(supabase) {
  const channel = supabase
    .channel("push-dispatcher-live")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_notifications",
      },
      (payload) => {
        const row = payload.new;

        if (!row?.push_enabled || row.push_sent_at) {
          return;
        }

        void processOneNotification(supabase, row, "realtime");
      },
    );

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout suscribiendo a Realtime para push dispatcher."));
    }, 15000);

    channel.subscribe((status) => {
      if (status === "CLOSED") {
        console.error("Canal realtime cerrado para push dispatcher.");
      }

      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve();
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        reject(new Error(`No se pudo suscribir al canal realtime (${status}).`));
      }
    });
  });

  console.log("Push dispatcher realtime activo.");

  const pollTimer = setInterval(() => {
    void processPendingNotifications(supabase).catch((error) => {
      console.error("Error en fallback polling del worker push:", error);
    });
  }, WATCH_POLL_INTERVAL_MS);

  console.log(`Fallback polling activo cada ${WATCH_POLL_INTERVAL_MS}ms.`);

  const shutdown = async () => {
    clearInterval(pollTimer);
    await supabase.removeChannel(channel);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });

  await new Promise(() => {});
}

async function main() {
  console.log(`Iniciando push dispatcher (watch=${WATCH_MODE ? "on" : "off"}, batchSize=${DISPATCH_BATCH_SIZE}).`);

  const serviceAccount = getFirebaseServiceAccount();

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  const supabase = getSupabaseAdminClient();

  await processPendingNotifications(supabase);

  if (WATCH_MODE) {
    await startRealtimeWatcher(supabase);
  }
}

main().catch((error) => {
  console.error("Error global en push-dispatcher:", error);
  process.exit(1);
});
