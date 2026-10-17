// ============================================================================
// BlimBlom — Frontend Configuration Template (config.example.js)
// ============================================================================
// Copy this file to public/js/config.js or run `npm run env:sync` after filling .env

export const FIREBASE_CONFIG = {
  apiKey: "TODO_INSERT_FIREBASE_API_KEY",
  authDomain: "TODO_INSERT_PROJECT_ID.firebaseapp.com",
  projectId: "TODO_INSERT_PROJECT_ID",
  storageBucket: "TODO_INSERT_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "TODO_INSERT_MESSAGING_SENDER_ID",
  appId: "TODO_INSERT_APP_ID"
};

export const VAPID_KEY = "TODO_INSERT_VAPID_PUBLIC_KEY";

export const CLOUD_RUN_URL = "TODO_INSERT_CLOUD_RUN_URL";

export function isConfigReady() {
  const hasFirebase =
    FIREBASE_CONFIG &&
    FIREBASE_CONFIG.apiKey &&
    !FIREBASE_CONFIG.apiKey.startsWith("TODO_") &&
    FIREBASE_CONFIG.projectId &&
    !FIREBASE_CONFIG.projectId.startsWith("TODO_");
  return Boolean(hasFirebase);
}

export function isCloudRunReady() {
  return Boolean(
    CLOUD_RUN_URL &&
      !CLOUD_RUN_URL.startsWith("TODO_") &&
      CLOUD_RUN_URL.startsWith("http")
  );
}

export function isVapidReady() {
  return Boolean(VAPID_KEY && !VAPID_KEY.startsWith("TODO_"));
}
