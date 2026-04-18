// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="esnext" />

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: any) => any): void;
};

import { createClient } from "@supabase/supabase-js";
// @ts-ignore - Supabase Edge Functions require the .ts extension for local bundled imports.
import { corsHeaders } from "../_shared/cors.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    push_enabled: boolean;
    push_attempts?: number;
    push_sent_at?: string;
  };
  schema: string;
  old_record?: any;
}

interface FCMResponse {
  name: string;
}

interface FCMError {
  error: {
    status: string;
    message: string;
    details: any[];
  };
}

function isInvalidFcmTokenError(code: string): boolean {
  return (
    code.includes("registration-token-not-registered")
    || code.includes("invalid-registration-token")
    || code.includes("UNREGISTERED")
    || code.includes("NOT_FOUND")
  );
}

function isSuccessfulFcmResponse(response: any): boolean {
  return response?.success === true;
}

function compactError(error: any): string {
  if (!error) return "unknown";
  const maybeCode = typeof error.code === "string" ? error.code : "";
  const maybeMessage = typeof error.message === "string" ? error.message : String(error);
  return [maybeCode, maybeMessage].filter(Boolean).join(": ").slice(0, 280);
}

async function markAsDelivered(supabase: any, notificationId: string, currentAttempts = 0) {
  const { error } = await supabase
    .from("user_notifications")
    .update({
      push_sent_at: new Date().toISOString(),
      push_last_error: null,
      push_attempts: currentAttempts + 1,
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`No se pudo marcar la notificacion ${notificationId} como enviada: ${error.message}`);
  }
}

async function markAsFailed(supabase: any, notificationId: string, reason: string, currentAttempts = 0) {
  const { error } = await supabase
    .from("user_notifications")
    .update({
      push_attempts: currentAttempts + 1,
      push_last_error: reason,
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`No se pudo marcar error de la notificacion ${notificationId}: ${error.message}`);
  }
}

async function markTokensInactive(supabase: any, tokens: string[]) {
  if (tokens.length === 0) return;

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

async function markTokensActive(supabase: any, tokens: string[]) {
  if (tokens.length === 0) return;

  const { error } = await supabase
    .from("user_push_tokens")
    .update({
      is_active: true,
      last_seen_at: new Date().toISOString(),
    })
    .in("token", tokens);

  if (error) {
    throw new Error(`No se pudieron activar tokens validos: ${error.message}`);
  }
}

const NO_TOKEN_RETRY_DELAYS_MS = [1500, 3500];
const INACTIVE_FALLBACK_MAX_AGE_MS = 2 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getActiveAndroidTokens(supabase: any, userId: string): Promise<string[]> {
  const { data: tokenRows, error: tokenError } = await supabase
    .from("user_push_tokens")
    .select("token")
    .eq("user_id", userId)
    .eq("platform", "android")
    .eq("is_active", true);

  if (tokenError) {
    throw new Error(`No se pudieron obtener tokens de ${userId}: ${tokenError.message}`);
  }

  return (tokenRows ?? [])
    .map((tokenRow: any) => tokenRow.token)
    .filter((token: string | null | undefined) => typeof token === "string" && token.length > 0);
}

async function getRecentAndroidTokensAnyStatus(supabase: any, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_push_tokens")
    .select("token,last_seen_at,is_active")
    .eq("user_id", userId)
    .eq("platform", "android")
    .order("last_seen_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(`No se pudieron obtener tokens recientes de ${userId}: ${error.message}`);
  }

  const now = Date.now();

  return (data ?? [])
    .filter((row: any) => row.is_active === false)
    .filter((row: any) => {
      const seenAt = typeof row.last_seen_at === "string" ? Date.parse(row.last_seen_at) : NaN;
      return Number.isFinite(seenAt) && now - seenAt <= INACTIVE_FALLBACK_MAX_AGE_MS;
    })
    .map((row: any) => row.token)
    .filter((token: string | null | undefined) => typeof token === "string" && token.length > 0);
}

function summarizeFailureCodes(responses: any[]): string {
  const counter = new Map<string, number>();

  for (const response of responses) {
    if (isSuccessfulFcmResponse(response)) continue;
    const code = typeof response?.error?.code === "string" && response.error.code.length > 0
      ? response.error.code
      : "UNKNOWN_ERROR";
    counter.set(code, (counter.get(code) ?? 0) + 1);
  }

  return Array.from(counter.entries())
    .map(([code, count]) => `${code}:${count}`)
    .join(",");
}

async function getTokenDiagnostics(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("user_push_tokens")
    .select("platform,is_active,last_seen_at")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .limit(50);

  if (error) {
    return `diag_error:${error.message}`;
  }

  const rows = data ?? [];
  const total = rows.length;
  const activeAndroid = rows.filter((row: any) => row.platform === "android" && row.is_active).length;
  const inactiveAndroid = rows.filter((row: any) => row.platform === "android" && !row.is_active).length;
  const activeOther = rows.filter((row: any) => row.platform !== "android" && row.is_active).length;
  const lastSeen = rows[0]?.last_seen_at ?? "none";

  return `total=${total};active_android=${activeAndroid};inactive_android=${inactiveAndroid};active_other=${activeOther};last_seen=${lastSeen}`;
}

async function sendFCMMessage(accessToken: string, projectId: string, payload: any): Promise<{ successCount: number; failureCount: number; responses: any[] }> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const responses: any[] = [];
  let successCount = 0;
  let failureCount = 0;

  // FCM sendEachForMulticast equivalent - send to each token individually
  for (const token of payload.tokens) {
    try {
      const message = {
        message: {
          token: token,
          notification: payload.notification,
          data: payload.data,
          android: payload.android,
        },
      };

      const response = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result: FCMResponse | FCMError = await response.json();

      if (response.ok && "name" in result) {
        responses.push({ success: true, messageId: result.name });
        successCount++;
      } else {
        const error = result as FCMError;
        responses.push({
          success: false,
          error: {
            code: error.error?.status || "UNKNOWN_ERROR",
            message: error.error?.message || "Unknown FCM error",
          },
        });
        failureCount++;
      }
    } catch (error) {
      responses.push({
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: compactError(error),
        },
      });
      failureCount++;
    }
  }

  return { successCount, failureCount, responses };
}

async function getFCMAccessToken(serviceAccount: any): Promise<string> {
  const jwtHeader = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // Create JWT signature
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(jwtHeader)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const message = `${headerB64}.${payloadB64}`;
  const pemToPkcs8Der = (pem: string): ArrayBuffer => {
    const base64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/g, "")
      .replace(/-----END PRIVATE KEY-----/g, "")
      .replace(/\s+/g, "");

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes.buffer;
  };

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8Der(serviceAccount.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(message));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${message}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(`Failed to get FCM access token: ${tokenData.error_description || tokenData.error}`);
  }

  return tokenData.access_token;
}

async function dispatchNotification(supabase: any, row: any, serviceAccount: any) {
  if (!row.push_enabled) {
    return { sent: false, reason: "push_disabled" };
  }

  if (!serviceAccount?.project_id) {
    throw new Error("Firebase service account missing project_id.");
  }

  let tokens = await getActiveAndroidTokens(supabase, row.user_id);

  if (tokens.length === 0) {
    for (const retryDelay of NO_TOKEN_RETRY_DELAYS_MS) {
      await sleep(retryDelay);
      tokens = await getActiveAndroidTokens(supabase, row.user_id);
      if (tokens.length > 0) {
        break;
      }
    }
  }

  let usingInactiveFallback = false;

  if (tokens.length === 0) {
    const recentTokens = await getRecentAndroidTokensAnyStatus(supabase, row.user_id);
    if (recentTokens.length > 0) {
      tokens = recentTokens;
      usingInactiveFallback = true;
      console.warn(`[push-handler] using_inactive_fallback notification=${row.id} user=${row.user_id} token_count=${tokens.length}`);
    }
  }

  if (tokens.length === 0) {
    const diagnostics = await getTokenDiagnostics(supabase, row.user_id);
    console.warn(`[push-handler] no_tokens notification=${row.id} user=${row.user_id} diagnostics=${diagnostics}`);
    await markAsFailed(supabase, row.id, `NO_ACTIVE_ANDROID_TOKENS_AFTER_RETRY:${diagnostics}`.slice(0, 280), row.push_attempts ?? 0);
    return { sent: false, reason: "no_tokens" };
  }

  const accessToken = await getFCMAccessToken(serviceAccount);

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

  const result = await sendFCMMessage(accessToken, serviceAccount.project_id, payload);
  const invalidTokens: string[] = [];
  let invalidTokenFailures = 0;
  let realFailures = 0;

  result.responses.forEach((response: any, index: number) => {
    if (!isSuccessfulFcmResponse(response)) {
      const code = response?.error?.code ?? "";
      if (isInvalidFcmTokenError(code)) {
        invalidTokens.push(tokens[index]);
        invalidTokenFailures++;
      } else {
        realFailures++;
      }
    }
  });

  if (usingInactiveFallback) {
    const successfulTokens: string[] = [];
    result.responses.forEach((response: any, index: number) => {
      if (isSuccessfulFcmResponse(response)) {
        successfulTokens.push(tokens[index]);
      }
    });
    if (successfulTokens.length > 0) {
      await markTokensActive(supabase, successfulTokens);
    }
  }

  if (invalidTokens.length > 0) {
    await markTokensInactive(supabase, invalidTokens);
  }

  if (result.successCount > 0) {
    await markAsDelivered(supabase, row.id, row.push_attempts ?? 0);
    return { sent: true, successCount: result.successCount, failureCount: result.failureCount };
  }

  if (invalidTokenFailures > 0 && realFailures === 0) {
    const codeSummary = summarizeFailureCodes(result.responses);
    const reason = `NO_VALID_ANDROID_TOKENS:${codeSummary || "none"}`;
    await markAsFailed(supabase, row.id, reason.slice(0, 280), row.push_attempts ?? 0);
    return { sent: false, reason: "no_valid_tokens" };
  }

  const firstError = compactError(result.responses[0]?.error);
  await markAsFailed(supabase, row.id, `FCM_FAILED:${firstError}`, row.push_attempts ?? 0);
  return { sent: false, reason: firstError };
}

console.log("Push handler Edge Function loaded!")

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only process INSERT events on user_notifications table
    if (payload.type !== "INSERT" || payload.table !== "user_notifications") {
      return new Response(JSON.stringify({ message: "Ignored non-INSERT event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const record = payload.record;

    // Skip if push already sent or disabled
    if (!record.push_enabled || record.push_sent_at) {
      return new Response(JSON.stringify({ message: "Push already sent or disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get secrets
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const firebaseServiceAccountJsonBase64 = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64");
    const firebaseServiceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

    if (!supabaseUrl || !serviceRoleKey || (!firebaseServiceAccountJsonBase64 && !firebaseServiceAccountJson)) {
      throw new Error("Missing required secrets: SUPABASE_URL, SERVICE_ROLE_KEY, FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 or FIREBASE_SERVICE_ACCOUNT_JSON");
    }

    function normalizeBase64(raw: string): string {
      const cleaned = raw.trim().replace(/\s+/g, "");
      const base64 = cleaned.replace(/-/g, "+").replace(/_/g, "/");
      const padding = base64.length % 4;
      return padding === 0 ? base64 : `${base64}${"=".repeat(4 - padding)}`;
    }

    function parseFirebaseServiceAccount(raw: string): any {
      const trimmed = raw.trim();

      if (trimmed.startsWith("{")) {
        return JSON.parse(trimmed);
      }

      const decoded = atob(normalizeBase64(trimmed));
      const decodedTrimmed = decoded.trim();

      if (decodedTrimmed.startsWith("{")) {
        return JSON.parse(decodedTrimmed);
      }

      return JSON.parse(decoded);
    }

    let serviceAccount: any;
    const rawServiceAccount = firebaseServiceAccountJson ?? firebaseServiceAccountJsonBase64!;

    try {
      serviceAccount = parseFirebaseServiceAccount(rawServiceAccount);
    } catch (parseError) {
      const preview = rawServiceAccount.slice(0, 200);
      throw new Error(`Invalid Firebase service account JSON or base64 secret. Secret preview: ${preview}`);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const result = await dispatchNotification(supabase, record, serviceAccount);

    if (result.sent) {
      console.log(`Push enviada para ${record.id}: ${result.successCount} exitos, ${result.failureCount} fallos`);
    } else {
      console.log(`Push no enviada para ${record.id}: ${result.reason}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error en push-handler:", error);
    return new Response(JSON.stringify({ error: compactError(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/push-handler' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
