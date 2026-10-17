# BlimBlom — Web App Specification (for AI Studio Build)

Build a installable Progressive Web App (PWA) called **BlimBlom**. It is a forest acoustic-alert dashboard for park rangers: sensors (simulated for this demo) detect sounds like elephants approaching farmland or illegal logging, Gemini analyzes each clip, and the app shows live incidents with push alerts.

## Positioning (for context, does not change what gets built)

The pitch frames this as the first piece of a larger vision: an AI bridge connecting the world's ecosystems — eventually fusing audio, image, ultrasonic, temperature, humidity and light data into a shared ecosystem big-data platform for researchers, conservationists and wildlife agencies. **The build in this spec implements only the audio + elephant-detection slice of that vision.** Do not add other sensor types, data fusion, or a general "big data platform" to the actual app — those stay in the pitch deck as roadmap, not in the code.

## Platform constraints (important)

- Must work as an **installable PWA on iOS Safari** (iPhone is the primary demo device). iOS only supports Web Push for a PWA that has been added to the Home Screen first (Settings icon in Safari → "Add to Home Screen"), and only on iOS 16.4+. Design the first-run flow around this:
  1. On first visit, show a banner/instructions telling the user to add the app to their Home Screen if not already installed (detect via `navigator.standalone` on iOS, or `display-mode: standalone` media query).
  2. Only request Notification permission *after* the app is confirmed running in standalone/installed mode, and only after a user tap (a button, not automatically on load) — iOS requires this to be a direct result of user interaction.
  3. If the device cannot get push (old iOS, desktop without permission, etc.), the app must still work by showing new incidents live in the list via Firestore real-time listeners — push is an enhancement, not a requirement for the core feature to be visible.
- Also must work normally in desktop Chrome and Android Chrome (standard PWA install + push, no special handling needed there).
- No native app, no app store — web only.

## Architecture (hybrid: one Cloud Run endpoint + client-direct)

- **Why hybrid:** the team wants to visibly showcase the Google Cloud stack (Cloud Run, Firebase, Gemini working together), not just Firebase alone. So exactly one real backend endpoint exists; everything else stays client-direct to save build time.
- **Cloud Run service** (`POST /analyze`): the single backend endpoint. Receives `{ sensor_id, sensor_name, location, audio_base64 }`, calls Gemini server-side with the stored API key (not exposed to the browser), writes the resulting `incidents` document to Firestore using the Admin SDK, and returns the created document. This is the only place Gemini is called — do not also call Gemini from the browser, to avoid two code paths doing the same thing.
- **Browser (client)**: calls the Cloud Run endpoint for the "Simulate sensor event" action, and reads/listens to Firestore directly via the Firebase JS SDK for the live alert list and detail screen. No other backend routes — keep this endpoint the only server code that exists.
- **Firebase project**: already created, now on a billing-enabled plan (Blaze) since Cloud Run requires it. The app receives a `firebaseConfig` object (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) for the client SDK — treat it as a placeholder to inject, e.g. from a `config.js` file I will supply.
- **Gemini**: called server-side only, inside the Cloud Run endpoint, using a current Gemini Flash model capable of audio understanding. The key lives in Cloud Run's environment variables / Secret Manager, never in client code.
- **Firestore collections**:
  - `incidents`: documents with fields `id`, `sensor_id`, `sensor_name` (string), `location` ({ lat, lng }), `audio_url` (string, a path to the clip), `event_type` ("elephant" | "chainsaw" | "vehicle" | "normal"), `confidence` (0–1), `urgency` ("low" | "medium" | "high"), `reasoning` (string), `alert_message_en` (string), `alert_message_th` (string), `status` ("new" | "acknowledged" | "en_route" | "resolved"), `created_at` (timestamp).
  - `subscribers`: documents keyed by FCM token, field `token` (string), `created_at` (timestamp) — used to send push to all installed devices.
- No authentication required for this demo — treat it as a single shared team view (no login screen).

## Screens

### 1. Alert list (home screen)
- Live list of `incidents`, newest first, via a Firestore `onSnapshot` listener (no manual refresh).
- Each row: event type icon/label, urgency badge (color-coded: high = red, medium = amber, low = gray), sensor name, relative time ("2 min ago"), and a short preview of `alert_message_en`.
- Tapping a row opens the detail screen for that incident.
- A visible "Simulate sensor event" button at the top (for demo purposes) that lets the presenter pick one of a few preset audio clips and trigger the full pipeline (upload → Gemini analysis → Firestore write) live, so the audience sees the system work end to end.
- Empty state: friendly message when there are no incidents yet.

### 2. Incident detail
- Shows: sensor name and location, timestamp, an `<audio>` player for the clip, the full Gemini `reasoning` text, `confidence` as a simple percentage, and both `alert_message_en` / `alert_message_th`.
- Three action buttons that update `status` in Firestore: **Acknowledge**, **On the way**, **Resolved**. Current status is shown as a badge.
- Back button to the list.

### 3. First-run / install prompt
- A lightweight full-screen or banner view shown only when the app is NOT running in standalone mode, with simple instructions (with a screenshot-style icon, not an actual screenshot) for adding to Home Screen on iOS and Android, and a "Continue in browser" link to skip and use the app without install (read-only list, no push).
- After confirmed standalone mode, show a one-time "Enable alerts" button that requests Notification permission on tap, retrieves the FCM token, and saves it to the `subscribers` collection.

## Visual style

- Clean, functional, high-contrast — this is a tool for rangers to glance at quickly, not a marketing site.
- Color meaning: red/amber/gray for urgency, used consistently across the list and detail badges.
- English UI labels throughout (competition rule: all submission materials must be in English). The `alert_message_th` field exists for the Thai-speaking ranger/farmer audience and is shown as a labeled secondary text, not the primary UI language.
- Must be fully usable on a phone screen (375px width minimum), no horizontal scrolling.

## Push notification behavior (when available)

- **Push is sent by the Cloud Run endpoint, not the browser.** The existing `/analyze` endpoint already sends a push to every token in `subscribers` when `urgency` is `"high"`. The frontend must NOT try to call the FCM API itself (it needs a server credential).
- The frontend's only push job: after the user taps "Enable alerts", call Firebase Messaging `getToken(messaging, { vapidKey, serviceWorkerRegistration })` and save the token to Firestore `subscribers/{token}` with fields `token` and `created_at`.
- Push payload from the server contains `data.incident_id`. In `firebase-messaging-sw.js`, handle `notificationclick` to open/focus the app at `/?incident=<id>`, and on load the app opens that incident's detail screen if the query parameter is present.

## Backend already exists — do not generate it

The Cloud Run service (`blimblom-api`, endpoint `POST /analyze`) is already written and deployed separately. Generate only the frontend. Request body the frontend must send:
`{ sensor_id, sensor_name, location: { lat, lng }, audio_url, mime_type: "audio/mp3", audio_base64 }`
Response: `{ id, pushed, event_type, confidence, urgency, reasoning, alert_message_en, alert_message_th }`.

## Non-goals for this build

- No user accounts/login.
- No offline caching of historical incidents (live data only is fine).
- No admin panel for managing sensors — sensor list can be a small hardcoded array used by the simulator.

## Deliverables I need from AI Studio

- Plain HTML/CSS/JS frontend (or a minimal framework if it genuinely speeds things up) — no complex build pipeline, since this needs to deploy to Firebase Hosting quickly under time pressure.
- A `firebase-messaging-sw.js` service worker file for background push.
- Clear placeholder comments (`// TODO: insert firebaseConfig here`, `// TODO: insert Gemini API key here` in the Cloud Run service, `// TODO: insert Cloud Run endpoint URL here` in the client) so I can drop in real values without digging through the code.
