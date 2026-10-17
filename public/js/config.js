// ============================================================================
// BlimBlom — Frontend Configuration
// ============================================================================
// IMPORTANT:
// - Never put a Gemini API key in this file or anywhere in the frontend.
// - Gemini is called server-side only inside the Cloud Run endpoint.
// - Fill in the values below from your team's Firebase Console & Cloud Run deploy.

// TODO: insert firebaseConfig here (from Firebase Console -> Project settings -> General -> Your apps -> Web app)
export const FIREBASE_CONFIG = {
  apiKey: "TODO_INSERT_FIREBASE_API_KEY",
  authDomain: "TODO_INSERT_PROJECT_ID.firebaseapp.com",
  projectId: "TODO_INSERT_PROJECT_ID",
  storageBucket: "TODO_INSERT_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "TODO_INSERT_MESSAGING_SENDER_ID",
  appId: "TODO_INSERT_APP_ID"
};

// TODO: insert VAPID key here (from Firebase Console -> Project settings -> Cloud Messaging -> Web Push certificates)
export const VAPID_KEY = "TODO_INSERT_VAPID_PUBLIC_KEY";

// TODO: insert Cloud Run endpoint URL here (e.g. "https://blimblom-api-xxxxx-as.a.run.app" — no trailing slash)
export const CLOUD_RUN_URL = "TODO_INSERT_CLOUD_RUN_URL";

/**
 * Helper to check whether the real configuration values have been filled in.
 */
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
