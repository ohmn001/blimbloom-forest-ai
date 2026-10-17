/* eslint-disable no-undef */
// ============================================================================
// BlimBlom — Firebase Cloud Messaging Service Worker
// Must stay at the root of public/ (/firebase-messaging-sw.js)
// ============================================================================

importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// TODO: insert firebaseConfig here (optional fallback — app.js also passes config from public/js/config.js automatically)
const FALLBACK_FIREBASE_CONFIG = {
  apiKey: "TODO_INSERT_FIREBASE_API_KEY",
  authDomain: "TODO_INSERT_PROJECT_ID.firebaseapp.com",
  projectId: "TODO_INSERT_PROJECT_ID",
  storageBucket: "TODO_INSERT_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "TODO_INSERT_MESSAGING_SENDER_ID",
  appId: "TODO_INSERT_APP_ID"
};

function resolveFirebaseConfig() {
  try {
    const params = new URLSearchParams(self.location.search);
    const encoded = params.get("firebaseConfig");
    if (encoded) {
      const parsed = JSON.parse(decodeURIComponent(encoded));
      if (parsed && parsed.apiKey && !parsed.apiKey.startsWith("TODO_")) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[SW] Could not parse firebaseConfig from URL query:", err);
  }
  return FALLBACK_FIREBASE_CONFIG;
}

const activeConfig = resolveFirebaseConfig();

if (activeConfig && activeConfig.apiKey && !activeConfig.apiKey.startsWith("TODO_")) {
  firebase.initializeApp(activeConfig);
  const messaging = firebase.messaging();

  // The Cloud Run backend sends messages with a "notification" block, which the browser
  // displays automatically. Do NOT show a second notification in onBackgroundMessage
  // when payload.notification is already present.
  messaging.onBackgroundMessage((payload) => {
    console.log("[SW] Received background message:", payload);
    if (!payload.notification) {
      const data = payload.data || {};
      const title = data.title || "BlimBlom Forest Alert";
      const body = data.body || data.alert_message_en || "High-urgency acoustic event detected.";
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: {
          incident_id: data.incident_id || ""
        }
      });
    }
  });
}

// Handle tap on push notification -> open or focus /?incident=<data.incident_id>
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const fcmData = (notifData.FCM_MSG && notifData.FCM_MSG.data) || {};
  const incidentId = notifData.incident_id || fcmData.incident_id || "";
  const targetUrl = incidentId
    ? `/?incident=${encodeURIComponent(incidentId)}`
    : "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.focus();
            if (incidentId) {
              client.postMessage({
                type: "OPEN_INCIDENT",
                incident_id: incidentId
              });
            }
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return null;
      })
  );
});
