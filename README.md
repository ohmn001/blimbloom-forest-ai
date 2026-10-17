# 🌲 BLIMBLOOM — Protect & Amplify
**Thailand Forest Ecosystem AI & Acoustic Early Warning Platform**  
*Google Cloud AI Builder Cup 2026 · Theme: Sustainability & Social Impact*

![Blimbloom Official Logo](./public/icons/blimbloom-logo.png)

---

## 🎯 Architecture Overview
`Forest Sensor (or Simulator) -> Cloud Run (POST /analyze) -> Gemini 2.5 Flash -> Firestore (incidents) & FCM Push -> BLIMBLOOM Web & Mobile Ranger PWA`

1. **Page 1 — Thailand Forest GIS Map & Early Warning Feed (`🗺️ แผนที่และแจ้งเตือนภัย`)**:
   - Interactive GIS map of Thailand (Kui Buri National Park, Khao Yai, Huai Kha Khaeng, and National Overview) with contextual sensor markers (`🐘 Elephant`, `🪚 Chainsaw`, `🦗 Crickets`, `📷 AI TrailCam`, `🦇 Ultrasonic Bio-Sonar`).
   - Real-time Firestore `onSnapshot` alert stream with inline audio evidence player and 1-tap Ranger `Acknowledge` / `On the way` / `Resolved` status updates.
2. **Page 2 — Big Data & ESG Analytics (`📊 ข้อมูลวิจัย & คาร์บอนเครดิต`)**:
   - Multi-sensor correlation charts, 6-modality data ingestion metrics, **Carbon & Ecology Index (AAA Grade)** for corporate ESG sponsors, and 1-click CSV / API JSON export.
3. **Page 3 — Hardware Integration & Cloud Health (`🔌 อุปกรณ์ & สถานะระบบ`)**:
   - Connected field device registry (`ESP32`, `Raspberry Pi`, `Legacy CCTV`, `Ultrasonic Array`) and Cloud Run / Gemini / Firestore health monitors.
4. **Page 4 — Mobile Ranger App (`📱 แอปเจ้าหน้าที่ภาคสนาม` — iOS / Android PWA)**:
   - Installable Progressive Web App (`manifest.json` + `firebase-messaging-sw.js`) with native-style mobile bottom navigation bar and FCM Web Push notifications.

---

## 🚀 Quick Start (Local Development)

```bash
# Run local server on http://localhost:3000 (works out-of-the-box in Demo Mode!)
npm start
```

---

## ☁️ Cloud Team Handoff (วิธีเชื่อมต่อ Cloud Run & Firebase สำหรับทีม Cloud)

### วิธีที่ 1: ใช้ไฟล์ `.env` (แนะนำ)
1. คัดลอกไฟล์ `.env.example` เป็น `.env`:
   ```bash
   cp .env.example .env
   ```
2. นำค่าจาก **Firebase Console** และ **Cloud Run Service URL** ไปใส่ใน `.env`:
   ```env
   CLOUD_RUN_URL=https://blimblom-api-xxxxx-as.a.run.app
   FIREBASE_API_KEY=AIzaSy...
   FIREBASE_AUTH_DOMAIN=blimblom-xxxx.firebaseapp.com
   FIREBASE_PROJECT_ID=blimblom-xxxx
   FIREBASE_STORAGE_BUCKET=blimblom-xxxx.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=1234567890
   FIREBASE_APP_ID=1:1234567890:web:abcdef
   FIREBASE_VAPID_KEY=BEl62i...
   ```
3. รันคำสั่งซิงค์ค่าเข้าสู่ `public/js/config.js` อัตโนมัติ:
   ```bash
   npm run env:sync
   ```

### วิธีที่ 2: แก้ไขไฟล์ `public/js/config.js` โดยตรง
เปิดไฟล์ [`public/js/config.js`](./public/js/config.js) แล้วแทนที่ค่า `TODO_...` ทั้ง 3 ส่วน (`FIREBASE_CONFIG`, `VAPID_KEY`, `CLOUD_RUN_URL`)

> ⚠️ **ข้อควรระวังด้านความปลอดภัย:** ห้ามใส่ `GEMINI_API_KEY` ลงในโค้ดฝั่ง Frontend เด็ดขาด ให้เก็บไว้ใน **Google Cloud Secret Manager** ของฝั่ง Cloud Run เท่านั้น

---

## 📡 API & Firestore Contract (สำหรับทีม Cloud Run)

### 1. `POST {CLOUD_RUN_URL}/analyze`
เมื่อกดปุ่มจำลองเซนเซอร์ในหน้าเว็บ ระบบจะส่ง HTTP `POST` พร้อม JSON body ดังนี้:
```json
{
  "sensor_id": "S01",
  "sensor_name": "Kui Buri North Gate",
  "location": { "lat": 12.16, "lng": 99.53 },
  "audio_url": "audio/elephant_1.mp3",
  "mime_type": "audio/mp3",
  "audio_base64": "<base64-encoded-audio-bytes>"
}
```

**Response ที่ Cloud Run ส่งกลับ (และบันทึกลง Firestore collection `incidents`):**
```json
{
  "id": "firestore-doc-id",
  "sensor_id": "S01",
  "sensor_name": "Kui Buri North Gate",
  "location": { "lat": 12.16, "lng": 99.53 },
  "audio_url": "audio/elephant_1.mp3",
  "event_type": "elephant",
  "confidence": 0.94,
  "urgency": "high",
  "reasoning": "Distinct low-frequency rumble followed by elephant trumpet vocalization.",
  "alert_message_th": "ตรวจพบเสียงช้างป่าร้องบริเวณประตูกุยบุรีเหนือ ขอให้ชุดเฝ้าระวังเข้าตรวจสอบ",
  "alert_message_en": "Wild elephant vocalization detected at Kui Buri North Gate.",
  "status": "new"
}
```

### 2. Deploy ขึ้น Firebase Hosting
```bash
firebase login
firebase use <YOUR_FIREBASE_PROJECT_ID>
npm run deploy:hosting
```
