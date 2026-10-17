#!/usr/bin/env node
// ============================================================================
// BLIMBLOOM — Sync .env variables into public/js/config.js
// Usage:
//   cp .env.example .env
//   # Fill in .env
//   npm run env:sync
// ============================================================================

const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const configPath = path.join(__dirname, "..", "public", "js", "config.js");

if (!fs.existsSync(envPath)) {
  console.log("[env:sync] No .env file found. Keeping existing public/js/config.js.");
  process.exit(0);
}

const rawEnv = fs.readFileSync(envPath, "utf8");
const env = {};

for (const line of rawEnv.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const projectId = env.FIREBASE_PROJECT_ID || "TODO_INSERT_PROJECT_ID";
const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY || "TODO_INSERT_FIREBASE_API_KEY",
  authDomain: env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  messagingSenderId:
    env.FIREBASE_MESSAGING_SENDER_ID || "TODO_INSERT_MESSAGING_SENDER_ID",
  appId: env.FIREBASE_APP_ID || "TODO_INSERT_APP_ID"
};

const vapidKey = env.FIREBASE_VAPID_KEY || "TODO_INSERT_VAPID_PUBLIC_KEY";
const cloudRunUrl = (env.CLOUD_RUN_URL || "TODO_INSERT_CLOUD_RUN_URL").replace(
  /\/$/,
  ""
);

const output = `// ============================================================================
// BlimBlom — Frontend Configuration (Synced from .env)
// ============================================================================
// IMPORTANT:
// - Never put a Gemini API key in this file or anywhere in the frontend.
// - Gemini is called server-side only inside the Cloud Run endpoint.
// - Fill in the values below from your team's Firebase Console & Cloud Run deploy.

// TODO: insert firebaseConfig here (from Firebase Console -> Project settings -> General -> Your apps -> Web app)
export const FIREBASE_CONFIG = ${JSON.stringify(firebaseConfig, null, 2)};

// TODO: insert VAPID key here (from Firebase Console -> Project settings -> Cloud Messaging -> Web Push certificates)
export const VAPID_KEY = ${JSON.stringify(vapidKey)};

// TODO: insert Cloud Run endpoint URL here (e.g. "https://blimblom-api-xxxxx-as.a.run.app" — no trailing slash)
export const CLOUD_RUN_URL = ${JSON.stringify(cloudRunUrl)};

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
`;

fs.writeFileSync(configPath, output, "utf8");
console.log("[env:sync] Successfully updated public/js/config.js from .env!");
