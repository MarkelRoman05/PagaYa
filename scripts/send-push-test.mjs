import fs from "node:fs";
import admin from "firebase-admin";

const [, , token, titleArg, bodyArg] = process.argv;

if (!token) {
  console.error("Uso: npm run push:test -- <FCM_TOKEN> [titulo] [mensaje]");
  process.exit(1);
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  console.error("Falta FIREBASE_SERVICE_ACCOUNT_PATH en variables de entorno.");
  process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`No existe el archivo de credenciales: ${serviceAccountPath}`);
  process.exit(1);
}

const rawServiceAccount = fs.readFileSync(serviceAccountPath, "utf8");
const serviceAccount = JSON.parse(rawServiceAccount);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const title = titleArg ?? "Prueba PagaYa";
const body = bodyArg ?? "Push funcionando";

const message = {
  token,
  notification: {
    title,
    body,
  },
  data: {
    source: "manual_test",
    sent_at: new Date().toISOString(),
  },
  android: {
    priority: "high",
    notification: {
      channelId: "default",
      sound: "default",
    },
  },
};

try {
  const messageId = await admin.messaging().send(message);
  console.log("Push enviada correctamente.");
  console.log(`messageId: ${messageId}`);
} catch (error) {
  console.error("Error enviando push:");
  console.error(error);
  process.exit(1);
}
