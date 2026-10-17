// ============================================================================
// BLIMBLOOM · Protect & Amplify
// Thailand Forest Ecosystem AI & Early Warning Command Center
// Connects Forest Hardware Nodes -> Cloud Run (POST /analyze) -> Gemini AI ->
// Firestore (onSnapshot) & FCM Push -> Enterprise GIS & Big Data Dashboard
// ============================================================================

import {
  FIREBASE_CONFIG,
  VAPID_KEY,
  CLOUD_RUN_URL,
  isConfigReady,
  isCloudRunReady,
  isVapidReady
} from "./config.js";
import { SENSORS, loadSensorAudioPayload } from "./sensors.js";
import { getCurrentLang, setLanguage, t } from "./i18n.js";

// Official Firebase JS SDK (gstatic CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported as isMessagingSupported
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";

// ----------------------------------------------------------------------------
// Hardware Node Registry (With Bilingual Thai/English Metadata & Contextual Emojis)
// ----------------------------------------------------------------------------
const HARDWARE_NODES = [
  {
    node_id: "S01",
    sensor_name: "Kui Buri North Gate",
    thai_zone: "ประตูกุยบุรีเหนือ · จ.ประจวบคีรีขันธ์",
    en_zone: "North Gate Sector · Kui Buri National Park",
    content_icon: "🐘",
    content_role: "ตรวจจับเสียงช้างป่าร้องแปร๋น (Elephant Vocalization)",
    content_role_en: "Asian Elephant Vocalization & Perimeter Intrusion Detection",
    hardware_type: "ESP32-S3 Edge Mic + BME280",
    modalities: ["Audio", "Temp", "Humidity", "Light"],
    protocol: "HTTPS / MQTT (Solar 4G)",
    battery: 94,
    status: "alert", // alert = Amber pulsing ring, normal = Forest green, lowbat = Red
    location: { lat: 12.16, lng: 99.53 },
    telemetry: { temp_c: 27.1, humidity_rh: 74, light_lux: 380, ultrasonic_khz: 42.5 },
    last_sound: "🐘 เสียงช้างป่าร้องแปร๋น (AI 94%)",
    last_sound_en: "🐘 Asian Elephant Trumpet Detected (AI 94%)",
    audio_url: "audio/elephant_1.mp3",
    can_simulate: true
  },
  {
    node_id: "S02",
    sensor_name: "Ban Rai Farm Edge",
    thai_zone: "แนวรั้วไร่บ้านรวมไทย · จ.ประจวบคีรีขันธ์",
    en_zone: "Ban Ruam Thai Crop Buffer · Prachuap Khiri Khan",
    content_icon: "🐘",
    content_role: "เฝ้าระวังช้างป่าประชิดพื้นที่เกษตรกรรม",
    content_role_en: "Human-Elephant Conflict (HEC) Crop Boundary Early Warning",
    hardware_type: "Raspberry Pi 4 + Acoustic + IR Bridge",
    modalities: ["Audio", "Image Trap", "Temp", "Humidity"],
    protocol: "HTTPS REST / 4G LTE",
    battery: 88,
    status: "normal",
    location: { lat: 12.14, lng: 99.55 },
    telemetry: { temp_c: 27.8, humidity_rh: 71, light_lux: 510, ultrasonic_khz: 38.0 },
    last_sound: "🐘 เฝ้าระวังด่านช้างออกไร่สับปะรด",
    last_sound_en: "🐘 Monitoring Pineapple Farm Corridor",
    audio_url: "audio/elephant_2.mp3",
    can_simulate: true
  },
  {
    node_id: "S03",
    sensor_name: "Deep Forest East",
    thai_zone: "ป่าลึกทิศตะวันออก · อุทยานแห่งชาติกุยบุรี",
    en_zone: "Eastern Core Canopy · Kui Buri National Park",
    content_icon: "🪚",
    content_role: "ตรวจจับเสียงเลื่อยยนต์และขบวนการลักลอบตัดไม้",
    content_role_en: "Anti-Poaching & Illegal Chainsaw Acoustic Detection",
    hardware_type: "ESP32 Canopy Acoustic Array",
    modalities: ["Audio", "Ultrasonic", "Temp", "Light"],
    protocol: "LoRaWAN → Cloud Run Gateway",
    battery: 79,
    status: "alert",
    location: { lat: 12.2, lng: 99.58 },
    telemetry: { temp_c: 25.9, humidity_rh: 82, light_lux: 420, ultrasonic_khz: 64.2 },
    last_sound: "🪚 เสียงเลื่อยโซ่ยนต์ตัดไม้ (AI 89%)",
    last_sound_en: "🪚 Two-Stroke Chainsaw Signature (AI 89%)",
    audio_url: "audio/chainsaw_1.wav",
    can_simulate: true
  },
  {
    node_id: "S04",
    sensor_name: "Stream Bank",
    thai_zone: "ริมลำธารธรรมชาติ · อุทยานแห่งชาติกุยบุรี",
    en_zone: "Riparian Stream Corridor · Kui Buri National Park",
    content_icon: "🦗",
    content_role: "ตรวจวัดเสียงแมลงกลางคืนและความสมบูรณ์ระบบนิเวศ",
    content_role_en: "Bio-Acoustic Biodiversity & Nocturnal Insect Baseline",
    hardware_type: "Riparian Bio-Acoustic + Lux Node",
    modalities: ["Audio", "Temp", "Humidity", "Light"],
    protocol: "LoRaWAN → Cloud Run Gateway",
    battery: 91,
    status: "normal",
    location: { lat: 12.12, lng: 99.5 },
    telemetry: { temp_c: 24.8, humidity_rh: 88, light_lux: 190, ultrasonic_khz: 58.9 },
    last_sound: "🦗 เสียงจิ้งหรีดและลำธารปกติ (AI 97%)",
    last_sound_en: "🦗 Normal Crickets & Stream Baseline (AI 97%)",
    audio_url: "audio/crickets_1.wav",
    can_simulate: true
  },
  {
    node_id: "CAM-05",
    sensor_name: "West Corridor TrailCam",
    thai_zone: "ด่านสัตว์ป่าทิศตะวันตก · อุทยานแห่งชาติกุยบุรี",
    en_zone: "Western Wildlife Corridor · Kui Buri National Park",
    content_icon: "📷",
    content_role: "กล้องดักถ่ายสัตว์ป่า AI + เซนเซอร์วัดความชื้นเสี่ยงไฟป่า",
    content_role_en: "Edge AI Camera Trap + Wildfire Microclimate Humidity Sensor",
    hardware_type: "Park Legacy CCTV + Edge AI Bridge",
    modalities: ["Image", "Thermal", "Temp", "Humidity"],
    protocol: "RTSP → Cloud Run Bridge",
    battery: 19,
    status: "lowbat",
    location: { lat: 12.15, lng: 99.49 },
    telemetry: { temp_c: 28.4, humidity_rh: 63, light_lux: 610, ultrasonic_khz: 31.0 },
    last_sound: "📷 กล้องดักถ่าย AI (แจ้งเตือนแบตเตอรี่ต่ำ 19%)",
    last_sound_en: "📷 AI TrailCam (Low Battery Warning 19%)",
    audio_url: "audio/elephant_1.mp3",
    can_simulate: false
  },
  {
    node_id: "ULT-06",
    sensor_name: "Canopy Ridge Bio-Sonar",
    thai_zone: "สันเขาเรือนยอดไม้ · อุทยานแห่งชาติกุยบุรี",
    en_zone: "High-Mountain Canopy Ridge · Kui Buri National Park",
    content_icon: "🦇",
    content_role: "เรดาร์คลื่นอัลตราโซนิกตรวจวัดค้างคาวและชีวภาพป่า",
    content_role_en: "192kHz Ultrasonic Bat Echolocation & Canopy Richness Array",
    hardware_type: "Ultrasonic 192kHz Bat & Insect Array",
    modalities: ["Ultrasonic", "Audio", "Temp", "Light"],
    protocol: "MQTT / TLS Satellite Backhaul",
    battery: 96,
    status: "normal",
    location: { lat: 12.18, lng: 99.6 },
    telemetry: { temp_c: 24.2, humidity_rh: 85, light_lux: 290, ultrasonic_khz: 96.4 },
    last_sound: "🦇 คลื่นโซนาร์ค้างคาวหนาแน่น (สมบูรณ์สูง)",
    last_sound_en: "🦇 High Bat Echolocation Density (Rich Canopy)",
    audio_url: "audio/crickets_1.wav",
    can_simulate: false
  }
];

// National Forest Network Hubs across Thailand (shown when zooming out to Thailand Overview)
const THAILAND_NATIONAL_HUBS = [
  {
    hub_id: "TH-KY",
    name: "อุทยานแห่งชาติเขาใหญ่ ( จ.นครราชสีมา )",
    name_en: "Khao Yai National Park (Nakhon Ratchasima)",
    icon: "🌳",
    lat: 14.438,
    lng: 101.372,
    desc: "เครือข่ายเซนเซอร์เสียงช้างป่าและไม้พะยูง 12 โหนด · สถานะปกติ",
    desc_en: "12 Siamese Rosewood & Wild Elephant Acoustic Nodes · Online"
  },
  {
    hub_id: "TH-HKK",
    name: "เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง ( จ.อุทัยธานี )",
    name_en: "Huai Kha Khaeng Wildlife Sanctuary (Uthai Thani)",
    icon: "🐅",
    lat: 15.625,
    lng: 99.325,
    desc: "มรดกโลกทางธรรมชาติ · เซนเซอร์ชีวอะคูสติกและกล้องดักถ่ายเสือโคร่ง 18 โหนด",
    desc_en: "UNESCO World Heritage · 18 Indochinese Tiger & Bio-Acoustic Nodes"
  },
  {
    hub_id: "TH-KKC",
    name: "อุทยานแห่งชาติแก่งกระจาน ( จ.เพชรบุรี )",
    name_en: "Kaeng Krachan National Park (Phetchaburi)",
    icon: "🌿",
    lat: 12.885,
    lng: 99.632,
    desc: "กลุ่มป่าแก่งกระจาน · เชื่อมต่อระบบเฝ้าระวังไฟป่าและสัตว์ป่า 9 โหนด",
    desc_en: "Kaeng Krachan Forest Complex · 9 Wildfire & Wildlife Nodes"
  },
  {
    hub_id: "TH-DOI",
    name: "อุทยานแห่งชาติดอยอินทนนท์ ( จ.เชียงใหม่ )",
    name_en: "Doi Inthanon National Park (Chiang Mai)",
    icon: "🌲",
    lat: 18.588,
    lng: 98.486,
    desc: "สถานีวิจัยความชื้นป่าต้นน้ำและเฝ้าระวังหมอกควัน/ไฟป่าภาคเหนือ",
    desc_en: "Upper-Watershed Cloud Forest & Northern Wildfire Research Hub"
  },
  {
    hub_id: "TH-KS",
    name: "อุทยานแห่งชาติเขาสก ( จ.สุราษฎร์ธานี )",
    name_en: "Khao Sok National Park (Surat Thani)",
    icon: "🐘",
    lat: 8.915,
    lng: 98.527,
    desc: "ป่าดิบชื้นภาคใต้ · เซนเซอร์วัดความหลากหลายทางเสียง (Bio-Acoustic Index)",
    desc_en: "Southern Tropical Rainforest · Bio-Acoustic Biodiversity Array"
  }
];

// Preset Coordinates for Thailand Zone Selector
const THAILAND_ZONES = {
  kuiburi: { center: [12.158, 99.545], zoom: 12 },
  thailand: { center: [13.65, 100.5], zoom: 6 },
  khaoyai: { center: [14.438, 101.372], zoom: 11 },
  huaikhakhaeng: { center: [15.625, 99.325], zoom: 11 }
};

// ----------------------------------------------------------------------------
// Application State
// ----------------------------------------------------------------------------
let db = null;
let firebaseApp = null;
let incidents = [];
let knownIncidentIds = new Set();
let isInitialSnapshot = true;
let activeIncidentId = null;
let deferredInstallPrompt = null;
let isSimulating = false;
let activeFilter = "all";
let selectedMapNodeId = "S01";
let heatmapVisible = true;
let isSatelliteView = false; // Default to Clear Thailand Map so Thai labels & borders are obvious
let leafletMap = null;
let satelliteTileLayer = null;
let thailandStreetTileLayer = null;
let leafletMarkers = new Map();
let nationalHubMarkers = [];
let heatmapCircleLayers = [];
let previewAudioPlayer = null;

// Sample incidents used when public/js/config.js still has TODO placeholders
const PREVIEW_INCIDENTS = [
  {
    id: "preview-inc-01",
    sensor_id: "S01",
    sensor_name: "Kui Buri North Gate",
    location: { lat: 12.16, lng: 99.53 },
    audio_url: "audio/elephant_1.mp3",
    event_type: "elephant",
    confidence: 0.94,
    urgency: "high",
    reasoning:
      "Distinct low-frequency rumble followed by a loud brassy elephant trumpet vocalization (~650 Hz fundamental with strong harmonics), indicating an adult elephant near the northern boundary gate.",
    alert_message_en:
      "Wild elephant vocalization detected at Kui Buri North Gate. Dispatch patrol team to prevent crop entry.",
    alert_message_th:
      "ตรวจพบเสียงช้างป่าร้องบริเวณประตูกุยบุรีเหนือ ขอให้ชุดเฝ้าระวังเข้าตรวจสอบเพื่อป้องกันช้างออกนอกแนวเขต",
    status: "new",
    created_at: { seconds: Math.floor((Date.now() - 2 * 60 * 1000) / 1000) }
  },
  {
    id: "preview-inc-02",
    sensor_id: "S03",
    sensor_name: "Deep Forest East",
    location: { lat: 12.2, lng: 99.58 },
    audio_url: "audio/chainsaw_1.wav",
    event_type: "chainsaw",
    confidence: 0.89,
    urgency: "high",
    reasoning:
      "Sustained two-stroke internal combustion engine whine with high-RPM cutting harmonics typical of a portable chainsaw operating in timber.",
    alert_message_en:
      "Chainsaw activity detected in Deep Forest East sector. Possible illegal logging in progress.",
    alert_message_th:
      "ตรวจพบเสียงเลื่อยยนต์ในพื้นที่ป่าลึกด้านตะวันออก คาดว่าอาจมีการลักลอบตัดไม้",
    status: "acknowledged",
    created_at: { seconds: Math.floor((Date.now() - 18 * 60 * 1000) / 1000) }
  },
  {
    id: "preview-inc-03",
    sensor_id: "S04",
    sensor_name: "Stream Bank",
    location: { lat: 12.12, lng: 99.5 },
    audio_url: "audio/crickets_1.wav",
    event_type: "normal",
    confidence: 0.97,
    urgency: "low",
    reasoning:
      "Steady nocturnal insect stridulation (crickets) and ambient water flow. No mechanical or large wildlife threat signatures present.",
    alert_message_en:
      "Normal ambient forest sound at Stream Bank. No ranger action required.",
    alert_message_th:
      "เสียงธรรมชาติปกติบริเวณริมลำธาร ไม่พบความผิดปกติ",
    status: "resolved",
    created_at: { seconds: Math.floor((Date.now() - 45 * 60 * 1000) / 1000) }
  }
];

// ----------------------------------------------------------------------------
// DOM Elements
// ----------------------------------------------------------------------------
const dom = {
  headerHomeLink: document.getElementById("headerHomeLink"),
  btnLangToggle: document.getElementById("btnLangToggle"),
  langToggleFlag: document.getElementById("langToggleFlag"),
  langToggleLabel: document.getElementById("langToggleLabel"),
  btnThemeToggle: document.getElementById("btnThemeToggle"),
  themeToggleIcon: document.getElementById("themeToggleIcon"),
  connectionBadge: document.getElementById("connectionBadge"),
  connectionText: document.getElementById("connectionText"),
  configNoticeBanner: document.getElementById("configNoticeBanner"),
  installBanner: document.getElementById("installBanner"),
  installInstructionsText: document.getElementById("installInstructionsText"),
  btnNativeInstall: document.getElementById("btnNativeInstall"),
  btnDismissInstall: document.getElementById("btnDismissInstall"),
  pushEnableBar: document.getElementById("pushEnableBar"),
  pushStatusTitle: document.getElementById("pushStatusTitle"),
  pushStatusDesc: document.getElementById("pushStatusDesc"),
  btnEnableAlerts: document.getElementById("btnEnableAlerts"),
  btnOpenSimulatorModal: document.getElementById("btnOpenSimulatorModal"),
  simulatorDrawer: document.getElementById("simulatorDrawer"),
  btnToggleSimulate: document.getElementById("btnToggleSimulate"),
  simulateBody: document.getElementById("simulateBody"),
  chkPlayOnSimulate: document.getElementById("chkPlayOnSimulate"),
  sensorButtonsGrid: document.getElementById("sensorButtonsGrid"),
  simulateStatusBox: document.getElementById("simulateStatusBox"),
  simulateStatusText: document.getElementById("simulateStatusText"),
  simulateErrorBox: document.getElementById("simulateErrorBox"),
  listView: document.getElementById("listView"),
  detailView: document.getElementById("detailView"),
  kpiSummarySection: document.getElementById("kpiSummarySection"),
  sectionMapAndAlerts: document.getElementById("sectionMapAndAlerts"),
  mapColumnCard: document.getElementById("mapColumnCard"),
  alertColumnCard: document.getElementById("alertColumnCard"),
  sectionAnalytics: document.getElementById("sectionAnalytics"),
  sectionHardware: document.getElementById("sectionHardware"),
  kpiHighCount: document.getElementById("kpiHighCount"),
  kpiAvgConfidence: document.getElementById("kpiAvgConfidence"),
  leafletMapEl: document.getElementById("leafletMap"),
  selectThailandZone: document.getElementById("selectThailandZone"),
  btnToggleMapStyle: document.getElementById("btnToggleMapStyle"),
  mapStyleLabel: document.getElementById("mapStyleLabel"),
  btnToggleHeatmap: document.getElementById("btnToggleHeatmap"),
  heatmapBtnLabel: document.getElementById("heatmapBtnLabel"),
  gisNodeTelemetryCard: document.getElementById("gisNodeTelemetryCard"),
  incidentCountBadge: document.getElementById("incidentCountBadge"),
  filterCountAll: document.getElementById("filterCountAll"),
  filterCountHigh: document.getElementById("filterCountHigh"),
  filterCountActive: document.getElementById("filterCountActive"),
  incidentsLoading: document.getElementById("incidentsLoading"),
  incidentsEmpty: document.getElementById("incidentsEmpty"),
  emptyStateTitle: document.getElementById("emptyStateTitle"),
  emptyStateDesc: document.getElementById("emptyStateDesc"),
  incidentsList: document.getElementById("incidentsList"),
  btnBackToList: document.getElementById("btnBackToList"),
  detailIdLabel: document.getElementById("detailIdLabel"),
  detailCard: document.getElementById("detailCard"),
  btnExportCsv: document.getElementById("btnExportCsv"),
  btnExportJson: document.getElementById("btnExportJson"),
  deviceRegistryTableBody: document.getElementById("deviceRegistryTableBody"),
  aiChatPanel: document.getElementById("aiChatPanel"),
  btnToggleAiChat: document.getElementById("btnToggleAiChat"),
  btnCloseAiChat: document.getElementById("btnCloseAiChat"),
  aiChatHistory: document.getElementById("aiChatHistory"),
  aiChatForm: document.getElementById("aiChatForm"),
  aiChatInput: document.getElementById("aiChatInput"),
  toastContainer: document.getElementById("toastContainer")
};

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getEventIcon(eventType) {
  switch ((eventType || "").toLowerCase()) {
    case "elephant":
      return "🐘";
    case "chainsaw":
      return "🪚";
    case "vehicle":
      return "🚙";
    case "normal":
    default:
      return "🦗";
  }
}

function getUrgencyClass(urgency) {
  const u = (urgency || "low").toLowerCase();
  if (u === "high") return "high";
  if (u === "medium") return "medium";
  return "low";
}

function formatStatusLabel(status) {
  switch ((status || "new").toLowerCase()) {
    case "acknowledged":
      return "Acknowledged";
    case "en_route":
      return "On the way";
    case "resolved":
      return "Resolved";
    case "new":
    default:
      return "New";
  }
}

function timestampToMillis(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  if (typeof ts._seconds === "number") return ts._seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function formatRelativeTime(createdAt) {
  const ms = timestampToMillis(createdAt);
  if (ms === null) return "just now";

  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 45) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function formatFullTimestamp(createdAt) {
  const ms = timestampToMillis(createdAt);
  if (ms === null) return "Just now (syncing timestamp)";
  const d = new Date(ms);
  return `${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })} · ${d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })}`;
}

function normalizeAudioUrl(audioUrl) {
  if (!audioUrl) return "";
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }
  const clean = audioUrl.replace(/^\/+/, "");
  return `./${clean}${clean.includes("?") ? "&" : "?"}v=real2026`;
}

function formatConfidencePercent(confidence) {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    return 0;
  }
  if (confidence <= 1) {
    return Math.round(confidence * 100);
  }
  return Math.min(100, Math.round(confidence));
}

function playAudioClipOutLoud(audioUrl) {
  if (!audioUrl) return;
  try {
    if (previewAudioPlayer) {
      previewAudioPlayer.pause();
    }
    previewAudioPlayer = new Audio(normalizeAudioUrl(audioUrl));
    previewAudioPlayer.volume = 0.9;
    previewAudioPlayer.play().catch(() => {});
  } catch (_) {
    // Ignore audio autoplay errors
  }
}

function showToast(message, options = {}) {
  const { urgency = "low", incidentId = null, durationMs = 5000 } = options;
  const toast = document.createElement("div");
  toast.className = `toast ${urgency === "high" ? "toast-high" : ""}`;

  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  if (incidentId) {
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "toast-action-btn";
    viewBtn.textContent = getCurrentLang() === "en" ? "View" : "ดูรายละเอียด";
    viewBtn.addEventListener("click", () => {
      openIncidentDetail(incidentId, true);
      toast.remove();
    });
    toast.appendChild(viewBtn);
  }

  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, durationMs);
}

// ----------------------------------------------------------------------------
// Bilingual Language Switcher (Thai 'th' / English 'en')
// ----------------------------------------------------------------------------
/**
 * Initializes the Thai / English (`TH / EN`) language switcher in the header.
 * - Restores the user's saved language preference from localStorage.
 * - Updates all static `[data-i18n]` and `[data-i18n-placeholder]` DOM nodes.
 * - Re-renders all dynamic UI sections (GIS telemetry card, sensor simulator
 *   buttons, hardware registry table, live alert feed, and active detail view)
 *   immediately when the user clicks `#btnLangToggle`.
 */
function initLanguageSwitcher() {
  const applyLangState = (lang) => {
    // 1. Update static DOM nodes via i18n module
    setLanguage(lang);

    // 2. Update header language toggle pill (Flag + TH/EN label)
    const isEn = lang === "en";
    if (dom.langToggleFlag) dom.langToggleFlag.textContent = isEn ? "🇬🇧" : "🇹🇭";
    if (dom.langToggleLabel) dom.langToggleLabel.textContent = isEn ? "EN" : "TH";

    // 3. Update map style & heatmap button labels according to active state
    if (dom.mapStyleLabel) {
      dom.mapStyleLabel.textContent = isSatelliteView
        ? t("map_style_sat")
        : t("map_style_clear");
    }
    if (dom.heatmapBtnLabel) {
      dom.heatmapBtnLabel.textContent = heatmapVisible
        ? t("heatmap_on")
        : t("heatmap_off");
    }
    if (dom.btnToggleSimulate && dom.simulateBody) {
      const isHidden = dom.simulateBody.classList.contains("hidden");
      dom.btnToggleSimulate.textContent = isHidden
        ? t("sim_btn_show")
        : t("sim_btn_hide");
    }

    // 4. Re-render dynamic components in the newly selected language
    renderSensorButtons();
    const currentNode =
      HARDWARE_NODES.find((n) => n.node_id === selectedMapNodeId) || HARDWARE_NODES[0];
    renderSelectedNodeTelemetry(currentNode);
    renderDeviceRegistryTable();
    renderIncidentsList();
    if (activeIncidentId) {
      const activeInc = incidents.find((i) => i.id === activeIncidentId);
      if (activeInc) renderIncidentDetailCard(activeInc);
    }
  };

  // Apply initial language on startup
  applyLangState(getCurrentLang());

  // Toggle between 'th' and 'en' when the header button is clicked
  if (dom.btnLangToggle) {
    dom.btnLangToggle.addEventListener("click", () => {
      const nextLang = getCurrentLang() === "th" ? "en" : "th";
      applyLangState(nextLang);
      showToast(
        nextLang === "en"
          ? "🇬🇧 Switched language to English (EN)"
          : "🇹🇭 เปลี่ยนภาษาเป็น ภาษาไทย (TH) เรียบร้อยแล้ว"
      );
    });
  }
}

// ----------------------------------------------------------------------------
// Theme Toggle (Light / Dark Mode)
// ----------------------------------------------------------------------------
function initThemeToggle() {
  const savedTheme = localStorage.getItem("blimbloom_theme");
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    if (dom.themeToggleIcon) dom.themeToggleIcon.textContent = "☀️";
  }

  if (dom.btnThemeToggle) {
    dom.btnThemeToggle.addEventListener("click", () => {
      const isDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("blimbloom_theme", isDark ? "dark" : "light");
      if (dom.themeToggleIcon) {
        dom.themeToggleIcon.textContent = isDark ? "☀️" : "🌙";
      }
    });
  }
}

// ----------------------------------------------------------------------------
// SECTION 1: Interactive Thailand GIS Map & Contextual Sensor Emojis
// ----------------------------------------------------------------------------
function initLeafletGisMap() {
  const currentNode =
    HARDWARE_NODES.find((n) => n.node_id === selectedMapNodeId) || HARDWARE_NODES[0];
  renderSelectedNodeTelemetry(currentNode);

  if (!dom.leafletMapEl || typeof window.L === "undefined") {
    return;
  }

  const L = window.L;
  leafletMap = L.map("leafletMap", {
    center: THAILAND_ZONES.kuiburi.center,
    zoom: THAILAND_ZONES.kuiburi.zoom,
    zoomControl: true
  });

  // Clear Thailand Map Layer with Thai/English labels & boundaries (OpenStreetMap)
  thailandStreetTileLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap · Thailand Forest Conservation GIS Network",
      maxZoom: 19
    }
  );

  // Satellite Layer (Esri World Imagery)
  satelliteTileLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Tiles &copy; Esri — Thailand Forest Satellite GIS",
      maxZoom: 18
    }
  );

  // Default to clear Thailand map so province/park names in Thailand are clearly visible
  thailandStreetTileLayer.addTo(leafletMap);

  // Threat Heatmap Zones (Conflict & Logging Hotspots in Kui Buri)
  const hotspotConfigs = [
    {
      lat: 12.16,
      lng: 99.53,
      radius: 1700,
      color: "#dc2626",
      fillColor: "#dc2626",
      label: "🐘 พื้นที่เสี่ยงช้างป่าออกนอกแนวเขต · Kui Buri North Gate"
    },
    {
      lat: 12.2,
      lng: 99.58,
      radius: 1550,
      color: "#d97706",
      fillColor: "#d97706",
      label: "🪚 พื้นที่เฝ้าระวังการลักลอบตัดไม้ · Deep Forest East"
    },
    {
      lat: 12.14,
      lng: 99.55,
      radius: 1250,
      color: "#eab308",
      fillColor: "#eab308",
      label: "🌾 แนวกันชนพื้นที่เกษตรกรรม · Ban Rai Farm Edge"
    }
  ];

  heatmapCircleLayers = hotspotConfigs.map((h) => {
    const circle = L.circle([h.lat, h.lng], {
      radius: h.radius,
      color: h.color,
      weight: 1.5,
      fillColor: h.fillColor,
      fillOpacity: 0.22
    }).addTo(leafletMap);
    circle.bindTooltip(h.label, { direction: "top" });
    return circle;
  });

  // Render National Forest Hubs across Thailand (Khao Yai, Huai Kha Khaeng, Kaeng Krachan, Doi Inthanon, Khao Sok)
  nationalHubMarkers = THAILAND_NATIONAL_HUBS.map((hub) => {
    const isEn = getCurrentLang() === "en";
    const hubName = isEn ? hub.name_en || hub.name : hub.name;
    const hubDesc = isEn ? hub.desc_en || hub.desc : hub.desc;
    const divIcon = L.divIcon({
      className: "custom-sensor-marker",
      html: `
        <div class="marker-pin-wrapper">
          <div class="marker-pin-circle marker-normal">${hub.icon}</div>
          <span class="marker-pin-label">${escapeHtml(hubName)}</span>
        </div>
      `,
      iconSize: [180, 56],
      iconAnchor: [90, 22]
    });
    const m = L.marker([hub.lat, hub.lng], { icon: divIcon }).addTo(leafletMap);
    m.bindPopup(
      `<div style="font-family: inherit; font-size: 12px;">
        <strong>${hub.icon} ${escapeHtml(hubName)}</strong><br/>
        <span style="color:#475569;">${escapeHtml(hubDesc)}</span>
      </div>`
    );
    return m;
  });

  renderLeafletMarkers();

  // Thailand Zone Selector Dropdown
  if (dom.selectThailandZone) {
    dom.selectThailandZone.addEventListener("change", (e) => {
      const zoneKey = e.target.value;
      const targetZone = THAILAND_ZONES[zoneKey] || THAILAND_ZONES.kuiburi;
      if (leafletMap) {
        leafletMap.flyTo(targetZone.center, targetZone.zoom, { duration: 1.1 });
      }
    });
  }

  // Map Style Toggle (Clear Thailand Map vs Satellite View)
  if (dom.btnToggleMapStyle) {
    dom.btnToggleMapStyle.addEventListener("click", () => {
      if (!leafletMap) return;
      isSatelliteView = !isSatelliteView;
      if (isSatelliteView) {
        leafletMap.removeLayer(thailandStreetTileLayer);
        satelliteTileLayer.addTo(leafletMap);
        if (dom.mapStyleLabel) dom.mapStyleLabel.textContent = t("map_style_sat");
      } else {
        leafletMap.removeLayer(satelliteTileLayer);
        thailandStreetTileLayer.addTo(leafletMap);
        if (dom.mapStyleLabel) dom.mapStyleLabel.textContent = t("map_style_clear");
      }
    });
  }

  // Threat Heatmap Toggle
  if (dom.btnToggleHeatmap) {
    dom.btnToggleHeatmap.addEventListener("click", () => {
      if (!leafletMap) return;
      heatmapVisible = !heatmapVisible;
      dom.btnToggleHeatmap.setAttribute("aria-pressed", String(heatmapVisible));
      if (dom.heatmapBtnLabel) {
        dom.heatmapBtnLabel.textContent = heatmapVisible
          ? t("heatmap_on")
          : t("heatmap_off");
      }
      heatmapCircleLayers.forEach((circle) => {
        if (heatmapVisible) {
          circle.addTo(leafletMap);
        } else {
          leafletMap.removeLayer(circle);
        }
      });
    });
  }
}

function renderLeafletMarkers() {
  if (!leafletMap || typeof window.L === "undefined") return;
  const L = window.L;

  leafletMarkers.forEach((marker) => leafletMap.removeLayer(marker));
  leafletMarkers.clear();

  for (const node of HARDWARE_NODES) {
    const statusClass =
      node.status === "alert"
        ? "marker-alert"
        : node.status === "lowbat"
        ? "marker-lowbat"
        : "marker-normal";

    // Contextual emoji matching the actual sensor role/event (🐘, 🪚, 🦗, 📷, 🦇)
    const iconEmoji = node.content_icon || "🌲";

    const selectedRing =
      node.node_id === selectedMapNodeId
        ? "outline: 3px solid #143328; transform: scale(1.14);"
        : "";

    const divIcon = L.divIcon({
      className: "custom-sensor-marker",
      html: `
        <div class="marker-pin-wrapper">
          <div class="marker-pin-circle ${statusClass}" style="${selectedRing}">${iconEmoji}</div>
          <span class="marker-pin-label">${escapeHtml(node.node_id)} · ${escapeHtml(
        node.sensor_name
      )}</span>
        </div>
      `,
      iconSize: [150, 56],
      iconAnchor: [75, 22]
    });

    const marker = L.marker([node.location.lat, node.location.lng], {
      icon: divIcon
    }).addTo(leafletMap);

    const onSelect = () => {
      selectedMapNodeId = node.node_id;
      renderSelectedNodeTelemetry(node);
      renderLeafletMarkers();
    };

    marker.on("click", onSelect);
    marker.on("mouseover", () => {
      selectedMapNodeId = node.node_id;
      renderSelectedNodeTelemetry(node);
    });

    leafletMarkers.set(node.node_id, marker);
  }
}

function focusMapOnNode(nodeId) {
  selectedMapNodeId = nodeId;
  const node =
    HARDWARE_NODES.find((n) => n.node_id === nodeId) || HARDWARE_NODES[0];
  renderSelectedNodeTelemetry(node);
  renderLeafletMarkers();
  if (leafletMap && node) {
    if (dom.selectThailandZone) dom.selectThailandZone.value = "kuiburi";
    leafletMap.flyTo([node.location.lat, node.location.lng], 12, {
      duration: 0.8
    });
  }
}

function renderSelectedNodeTelemetry(node) {
  if (!dom.gisNodeTelemetryCard || !node) return;
  const isEn = getCurrentLang() === "en";
  const zoneLabel = isEn ? node.en_zone || node.thai_zone : node.thai_zone;
  const roleLabel = isEn ? node.content_role_en || node.content_role : node.content_role;
  const soundLabel = isEn ? node.last_sound_en || node.last_sound : node.last_sound;

  const statusBadgeHtml =
    node.status === "alert"
      ? `<span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">${escapeHtml(
          t("node_status_alert")
        )}</span>`
      : node.status === "lowbat"
      ? `<span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">${escapeHtml(
          t("node_status_lowbat")
        )} (${node.battery}%)</span>`
      : `<span class="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">${escapeHtml(
          t("node_status_normal")
        )} (${node.battery}%)</span>`;

  dom.gisNodeTelemetryCard.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg shadow-2xs">${
          node.content_icon || "🌲"
        }</span>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-extrabold px-2 py-0.5 rounded bg-[#143328] text-white">${escapeHtml(
              node.node_id
            )}</span>
            <strong class="text-sm font-extrabold text-slate-900 dark:text-white">${escapeHtml(
              node.sensor_name
            )}</strong>
          </div>
          <span class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(
            zoneLabel || ""
          )} · GPS ${node.location.lat.toFixed(2)}°N, ${node.location.lng.toFixed(
    2
  )}°E</span>
        </div>
      </div>
      ${statusBadgeHtml}
    </div>

    <div class="text-xs text-slate-600 dark:text-slate-400 mb-3">
      ${escapeHtml(t("node_role_label"))} <strong class="text-slate-800 dark:text-slate-200">${escapeHtml(
    roleLabel || node.hardware_type
  )}</strong> · ${escapeHtml(t("node_hw_label"))} <span class="text-[#143328] dark:text-emerald-400 font-semibold">${escapeHtml(
    node.hardware_type
  )}</span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center mb-3">
      <div>
        <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(
          t("node_temp_label")
        )}</span>
        <strong class="text-sm font-extrabold text-slate-900 dark:text-white">${
          node.telemetry.temp_c
        }°C</strong>
      </div>
      <div>
        <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(
          t("node_rh_label")
        )}</span>
        <strong class="text-sm font-extrabold text-sky-600 dark:text-sky-400">${
          node.telemetry.humidity_rh
        }% RH</strong>
      </div>
      <div>
        <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(
          t("node_lux_label")
        )}</span>
        <strong class="text-sm font-extrabold text-amber-600 dark:text-amber-400">${
          node.telemetry.light_lux
        } Lux</strong>
      </div>
      <div>
        <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400">${escapeHtml(
          t("node_ultra_label")
        )}</span>
        <strong class="text-sm font-extrabold text-purple-600 dark:text-purple-400">${
          node.telemetry.ultrasonic_khz
        } kHz</strong>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span class="text-slate-600 dark:text-slate-300">${escapeHtml(
        t("node_last_sound")
      )} <strong class="text-[#143328] dark:text-emerald-400">${escapeHtml(
    soundLabel
  )}</strong></span>
      <div class="flex items-center gap-2">
        <button type="button" id="btnMapPlayAudio" class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold transition">
          ${escapeHtml(t("btn_listen_sensor"))}
        </button>
        ${
          node.can_simulate
            ? `<button type="button" id="btnMapTriggerNode" class="px-3 py-1.5 rounded-lg bg-[#143328] hover:bg-[#1B4332] dark:bg-emerald-600 text-white text-xs font-bold shadow-2xs transition">
                ${escapeHtml(t("btn_trigger_gemini"))}
              </button>`
            : ""
        }
      </div>
    </div>
  `;

  const playBtn = document.getElementById("btnMapPlayAudio");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      playAudioClipOutLoud(node.audio_url);
      showToast(
        isEn
          ? `Playing live sensor audio from ${node.node_id} (${node.sensor_name})`
          : `กำลังเล่นเสียงจริงจากโหนด ${node.node_id} (${node.sensor_name})`
      );
    });
  }

  const triggerBtn = document.getElementById("btnMapTriggerNode");
  if (triggerBtn && node.can_simulate) {
    triggerBtn.addEventListener("click", () => {
      const matchingSensor = SENSORS.find((s) => s.sensor_id === node.node_id);
      if (matchingSensor) {
        handleSimulateSensor(matchingSensor);
      }
    });
  }
}

// ----------------------------------------------------------------------------
// SECTION 4: Hardware Device Registry Table
// ----------------------------------------------------------------------------
function renderDeviceRegistryTable() {
  if (!dom.deviceRegistryTableBody) return;
  dom.deviceRegistryTableBody.innerHTML = "";
  const isEn = getCurrentLang() === "en";

  for (const node of HARDWARE_NODES) {
    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition";

    const statusBadge =
      node.status === "alert"
        ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">${escapeHtml(
            t("node_status_alert")
          )}</span>`
        : node.status === "lowbat"
        ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">${escapeHtml(
            t("node_status_lowbat")
          )}</span>`
        : `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">${escapeHtml(
            t("node_status_normal")
          )}</span>`;

    const batteryColor =
      node.battery < 30
        ? "bg-red-500"
        : node.battery < 75
        ? "bg-amber-500"
        : "bg-emerald-500";

    const modalitiesHtml = node.modalities
      .map(
        (m) =>
          `<span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300">${escapeHtml(
            m
          )}</span>`
      )
      .join(" ");

    const zoneText = isEn ? node.en_zone || node.thai_zone : node.thai_zone;

    tr.innerHTML = `
      <td class="py-3.5 px-4">
        <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <span>${node.content_icon || "🌲"}</span>
          <span>${escapeHtml(node.node_id)} · ${escapeHtml(node.sensor_name)}</span>
        </div>
        <div class="text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(
          zoneText || ""
        )}</div>
      </td>
      <td class="py-3.5 px-4 text-slate-700 dark:text-slate-200 font-medium">${escapeHtml(
        node.hardware_type
      )}</td>
      <td class="py-3.5 px-4"><div class="flex flex-wrap gap-1">${modalitiesHtml}</div></td>
      <td class="py-3.5 px-4 font-mono text-[11px] text-[#143328] dark:text-emerald-400 font-semibold">${escapeHtml(
        node.protocol
      )}</td>
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-2">
          <div class="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full ${batteryColor}" style="width: ${node.battery}%"></div>
          </div>
          <span class="font-bold text-slate-700 dark:text-slate-200">${node.battery}%</span>
        </div>
      </td>
      <td class="py-3.5 px-4">${statusBadge}</td>
      <td class="py-3.5 px-4 text-right">
        ${
          node.can_simulate
            ? `<button type="button" class="btn-table-simulate px-3 py-1.5 rounded-lg bg-[#143328] hover:bg-[#1B4332] text-white font-bold text-xs transition shadow-2xs" data-sensor-id="${escapeHtml(
                node.node_id
              )}">
                ${escapeHtml(t("tbl_btn_sim"))}
              </button>`
            : `<button type="button" class="btn-table-focus px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs transition" data-node-id="${escapeHtml(
                node.node_id
              )}">
                ${escapeHtml(t("tbl_btn_map"))}
              </button>`
        }
      </td>
    `;

    dom.deviceRegistryTableBody.appendChild(tr);
  }

  dom.deviceRegistryTableBody
    .querySelectorAll(".btn-table-simulate")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const sensor = SENSORS.find((s) => s.sensor_id === btn.dataset.sensorId);
        if (sensor) handleSimulateSensor(sensor);
      });
    });

  dom.deviceRegistryTableBody
    .querySelectorAll(".btn-table-focus")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        switchActivePage("map-alerts");
        focusMapOnNode(btn.dataset.nodeId);
      });
    });
}

// ----------------------------------------------------------------------------
// SECTION 3: Big Data & Research Analytics (Chart.js + CSV/JSON Export)
// ----------------------------------------------------------------------------
function initAnalyticsCharts() {
  if (typeof window.Chart === "undefined") return;

  const ctxCorrelation = document.getElementById("multiSensorChart");
  if (ctxCorrelation) {
    new window.Chart(ctxCorrelation, {
      type: "line",
      data: {
        labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"],
        datasets: [
          {
            label: "จำนวนครั้งที่ตรวจพบเสียงช้างป่า",
            data: [4, 3, 1, 0, 2, 6, 5],
            borderColor: "#dc2626",
            backgroundColor: "rgba(220, 38, 38, 0.12)",
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            yAxisID: "yEvents"
          },
          {
            label: "ความชื้นสัมพัทธ์ (%RH)",
            data: [86, 89, 78, 62, 68, 82, 85],
            borderColor: "#0284c7",
            borderWidth: 2,
            borderDash: [4, 4],
            tension: 0.35,
            yAxisID: "yClimate"
          },
          {
            label: "อุณหภูมิ (°C)",
            data: [24.2, 23.5, 26.8, 32.4, 30.1, 26.1, 24.8],
            borderColor: "#d97706",
            borderWidth: 2,
            tension: 0.35,
            yAxisID: "yClimate"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#64748b", font: { size: 11, weight: "600" } }
          }
        },
        scales: {
          x: {
            ticks: { color: "#64748b", font: { size: 10 } },
            grid: { color: "rgba(148, 163, 184, 0.15)" }
          },
          yEvents: {
            type: "linear",
            position: "left",
            ticks: { color: "#dc2626", font: { size: 10 } },
            grid: { color: "rgba(148, 163, 184, 0.15)" }
          },
          yClimate: {
            type: "linear",
            position: "right",
            ticks: { color: "#0284c7", font: { size: 10 } },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  const ctxModality = document.getElementById("modalityBarChart");
  if (ctxModality) {
    new window.Chart(ctxModality, {
      type: "bar",
      data: {
        labels: ["เสียง (Audio)", "ภาพ (Image)", "อัลตราโซนิก", "อุณหภูมิ", "ความชื้น", "แสง (Lux)"],
        datasets: [
          {
            label: "ข้อมูลที่จัดเก็บต่อวัน (พันรายการ)",
            data: [14.2, 4.8, 11.6, 6.2, 6.2, 5.2],
            backgroundColor: [
              "#143328",
              "#0284c7",
              "#7c3aed",
              "#d97706",
              "#0891b2",
              "#ca8a04"
            ],
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: "#64748b", font: { size: 10, weight: "600" } },
            grid: { display: false }
          },
          y: {
            ticks: { color: "#64748b", font: { size: 10 } },
            grid: { color: "rgba(148, 163, 184, 0.15)" }
          }
        }
      }
    });
  }
}

function exportCsvDataset() {
  const headers = [
    "incident_id",
    "sensor_id",
    "sensor_name",
    "lat",
    "lng",
    "event_type",
    "confidence",
    "urgency",
    "status",
    "temp_c",
    "humidity_rh",
    "light_lux",
    "alert_message_en"
  ];
  const rows = incidents.map((inc) => {
    const node =
      HARDWARE_NODES.find((n) => n.node_id === inc.sensor_id) || HARDWARE_NODES[0];
    return [
      inc.id,
      inc.sensor_id || "",
      `"${(inc.sensor_name || "").replace(/"/g, '""')}"`,
      inc.location?.lat ?? "",
      inc.location?.lng ?? "",
      inc.event_type || "",
      inc.confidence ?? "",
      inc.urgency || "",
      inc.status || "new",
      node.telemetry.temp_c,
      node.telemetry.humidity_rh,
      node.telemetry.light_lux,
      `"${(inc.alert_message_en || "").replace(/"/g, '""')}"`
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `blimbloom_ecosystem_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("ดาวน์โหลดไฟล์ข้อมูลวิจัย (.CSV) เรียบร้อยแล้ว!");
}

function exportJsonDataset() {
  const payload = {
    platform: "BLIMBLOOM · Thailand Forest Ecosystem Big Data Lake",
    exported_at: new Date().toISOString(),
    esg_metrics: {
      forest_integrity_score: 94.2,
      carbon_protected_tco2e: 142850,
      acoustic_biodiversity_index: 8.74
    },
    hardware_nodes: HARDWARE_NODES,
    incidents
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `blimbloom_api_export_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("ดาวน์โหลดไฟล์ API JSON เรียบร้อยแล้ว!");
}

// ----------------------------------------------------------------------------
// SECTION 5: Blimbloom AI Assistant (Bilingual Gemini Ecosystem Chat)
// ----------------------------------------------------------------------------
/**
 * Generates a localized Thai or English Ecosystem Big Data insight based on
 * the currently selected language (`getCurrentLang()`).
 */
function generateGeminiEcosystemAnswer(questionText) {
  const q = (questionText || "").toLowerCase();
  const isEn = getCurrentLang() === "en";
  const elephantList = incidents.filter((i) => i.event_type === "elephant");
  const chainsawList = incidents.filter((i) => i.event_type === "chainsaw");

  if (q.includes("ช้าง") || q.includes("elephant")) {
    if (isEn) {
      return `🐘 <strong>Wild Elephant Intrusion Summary (Live Firestore + Multi-Sensor):</strong><br/>
• Detected <strong>${elephantList.length} elephant vocalization events</strong> (Avg AI confidence: <strong>94%</strong>)<br/>
• <strong>Highest Risk Sectors:</strong> <code>S01 Kui Buri North Gate</code> and <code>S02 Ban Rai Farm Edge</code> between 19:00–23:30 when relative humidity drops below 75% RH.<br/>
• <strong>Recommended Action:</strong> Deploy rapid-response rangers to North Gate and notify Moo 4 village headman immediately.`;
    }
    return `🐘 <strong>สรุปเหตุการณ์ช้างป่าบุกรุก (ข้อมูลสดจาก Firestore + Multi-Sensor):</strong><br/>
• ปัจจุบันตรวจพบสัญญาณเสียงช้างป่าทั้งหมด <strong>${elephantList.length} ครั้ง</strong> (ความมั่นใจเฉลี่ย <strong>94%</strong>)<br/>
• <strong>จุดเสี่ยงสูงสุด:</strong> <code>S01 Kui Buri North Gate</code> และ <code>S02 Ban Rai Farm Edge</code> โดยเฉพาะช่วงเวลา 19:00–23:30 น. เมื่อความชื้นในป่าลดต่ำกว่า 75% RH<br/>
• <strong>คำแนะนำสำหรับชุดลาดตระเวน:</strong> ส่งหน่วยเคลื่อนที่เร็วไปดักที่แนวรั้วประตูกุยบุรีเหนือ และเปิดระบบแจ้งเตือนผู้ใหญ่บ้านหมู่ที่ 4 ทันทีครับ`;
  }

  if (q.includes("ความชื้น") || q.includes("ไฟป่า") || q.includes("fire") || q.includes("humidity")) {
    if (isEn) {
      return `🔥 <strong>Low-Humidity & Wildfire Risk Forecast (7-Day Microclimate Model):</strong><br/>
• Multi-sensor fusion shows <strong><code>CAM-05 West Corridor</code> (28.4°C, 63% RH, 610 Lux)</strong> and <strong><code>S02 Ban Rai Farm Edge</code> (27.8°C, 71% RH)</strong> have the lowest relative humidity.<br/>
• <strong>7-Day Outlook:</strong> 34% elevated dry-fuel risk in the western corridor. Recommend clearing firebreaks and replacing battery on <code>CAM-05</code> (currently 19%).`;
    }
    return `🔥 <strong>วิเคราะห์ความเสี่ยงความชื้นต่ำและไฟป่า (7-Day Microclimate Forecast):</strong><br/>
• จากการหลอมรวมข้อมูลอุณหภูมิ + ความชื้น + ความเข้มแสง พบว่าจุด <strong><code>CAM-05 West Corridor</code> (28.4°C, ความชื้น 63% RH, แสง 610 Lux)</strong> และ <strong><code>S02 Ban Rai Farm Edge</code> (27.8°C, 71% RH)</strong> มีค่าความชื้นสัมพัทธ์ต่ำสุดในพื้นที่<br/>
• <strong>แนวโน้มสัปดาห์หน้า:</strong> มีโอกาสเกิดจุดความร้อนสะสมสูงขึ้น 34% แนะนำให้จัดทำแนวกันไฟและเปลี่ยนแบตเตอรี่ของโหนด <code>CAM-05</code> (เหลือ 19%) ครับ`;
  }

  if (q.includes("เลื่อยยนต์") || q.includes("ตำรวจ") || q.includes("report") || q.includes("chainsaw") || q.includes("ตัดไม้")) {
    if (isEn) {
      return `🪚 <strong>Chainsaw Acoustic Evidence Report (For Forestry Police & DNP):</strong><br/>
• <strong>Total Incidents:</strong> ${chainsawList.length} event(s) (<span class="text-red-600 dark:text-red-400 font-bold">HIGH PRIORITY</span>)<br/>
• <strong>GPS Coordinates:</strong> Node <code>S03 Deep Forest East</code> (LAT 12.2000°N, LNG 99.5800°E)<br/>
• <strong>Gemini AI Forensics:</strong> High-RPM two-stroke chainsaw engine harmonics confirmed (Confidence 89%) with attached WAV audio evidence. Click <strong>Export Dataset (CSV)</strong> to attach to the official investigation report.`;
    }
    return `🪚 <strong>รายงานหลักฐานการตรวจจับเสียงเลื่อยยนต์ (สำหรับส่งตำรวจป่าไม้และกรมอุทยานฯ):</strong><br/>
• <strong>จำนวนเหตุการณ์:</strong> ${chainsawList.length} รายการ (ระดับความเร่งด่วน: <span class="text-red-600 dark:text-red-400 font-bold">HIGH PRIORITY</span>)<br/>
• <strong>พิกัดเกิดเหตุ:</strong> โหนด <code>S03 Deep Forest East</code> (LAT 12.2000°N, LNG 99.5800°E)<br/>
• <strong>ผลวิเคราะห์จาก Gemini AI:</strong> ตรวจพบคลื่นความถี่เครื่องยนต์ 2 จังหวะรอบสูงตรงกับเลื่อยโซ่ยนต์ (Confidence 89%) พร้อมไฟล์เสียงหลักฐานแนบในระบบ สามารถกดปุ่ม <strong>ดาวน์โหลด Dataset (CSV)</strong> เพื่อแนบเป็นหลักฐานดำเนินคดีได้ทันทีครับ`;
  }

  if (isEn) {
    return `✨ <strong>Blimbloom Gemini Ecosystem Insight:</strong><br/>
Across all 6 multimodal streams (Audio, Image, Ultrasonic, Temp, RH, Light), there are currently <strong>${incidents.length} recorded events</strong> (${
      incidents.filter((i) => i.urgency === "high").length
    } high-priority). The Forest Integrity Score stands at <strong>94.2/100 (142,850 tCO₂e protected)</strong>. Ask me about <em>elephants</em>, <em>chainsaw enforcement</em>, or <em>wildfire humidity risk</em>!`;
  }

  return `✨ <strong>Blimbloom Gemini Ecosystem Insight:</strong><br/>
จากการประมวลผลข้อมูล Big Data ทั้ง 6 มิติ (เสียง, ภาพ, อัลตราโซนิก, อุณหภูมิ, ความชื้น, แสง) ขณะนี้มีเหตุการณ์ในระบบทั้งหมด <strong>${incidents.length} รายการ</strong> (เหตุด่วนสูง ${
    incidents.filter((i) => i.urgency === "high").length
  } รายการ) ดัชนีความสมบูรณ์ของป่าอยู่ที่ <strong>94.2/100 (ปกป้องคาร์บอนเครดิต 142,850 tCO₂e)</strong> คุณสามารถถามเฉพาะเจาะจงเกี่ยวกับ <em>ช้างป่า</em>, <em>เลื่อยยนต์</em> หรือ <em>ความเสี่ยงไฟป่า</em> ได้เลยครับ!`;
}

function appendAiChatMessage(sender, htmlContent) {
  if (!dom.aiChatHistory) return;
  const msg = document.createElement("div");
  msg.className = `ai-msg ${sender === "user" ? "ai-msg-user" : "ai-msg-bot"}`;
  if (sender === "user") {
    msg.textContent = htmlContent;
  } else {
    msg.innerHTML = `<div class="font-bold text-[#143328] dark:text-emerald-400 mb-1">✨ Blimbloom Gemini Assistant</div><div class="text-slate-700 dark:text-slate-200 leading-relaxed">${htmlContent}</div>`;
  }
  dom.aiChatHistory.appendChild(msg);
  dom.aiChatHistory.scrollTop = dom.aiChatHistory.scrollHeight;
}

function initAiAssistantChat() {
  if (!dom.btnToggleAiChat || !dom.aiChatPanel) return;

  dom.btnToggleAiChat.addEventListener("click", () => {
    dom.aiChatPanel.classList.toggle("hidden");
  });

  if (dom.btnCloseAiChat) {
    dom.btnCloseAiChat.addEventListener("click", () => {
      dom.aiChatPanel.classList.add("hidden");
    });
  }

  document.querySelectorAll(".ai-prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const promptKey = chip.dataset.prompt;
      const visibleLabel = chip.textContent.trim();
      if (!promptKey) return;
      dom.aiChatPanel.classList.remove("hidden");
      appendAiChatMessage("user", visibleLabel);
      setTimeout(() => {
        appendAiChatMessage("bot", generateGeminiEcosystemAnswer(promptKey));
      }, 350);
    });
  });

  if (dom.aiChatForm && dom.aiChatInput) {
    dom.aiChatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = dom.aiChatInput.value.trim();
      if (!text) return;
      dom.aiChatInput.value = "";
      appendAiChatMessage("user", text);
      setTimeout(() => {
        appendAiChatMessage("bot", generateGeminiEcosystemAnswer(text));
      }, 350);
    });
  }
}

// ----------------------------------------------------------------------------
// Standalone / PWA Install & Push Flow (C5)
// ----------------------------------------------------------------------------
function isRunningStandalone() {
  const iosStandalone = window.navigator.standalone === true;
  const displayModeStandalone =
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches;
  return Boolean(iosStandalone || displayModeStandalone);
}

function isIosDevice() {
  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS;
}

function initInstallAndPushFlow() {
  const standalone = isRunningStandalone();

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!isRunningStandalone()) {
      dom.btnNativeInstall.classList.remove("hidden");
    }
  });

  dom.btnNativeInstall.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    dom.btnNativeInstall.classList.add("hidden");
  });

  dom.btnDismissInstall.addEventListener("click", () => {
    dom.installBanner.classList.add("hidden");
  });

  if (standalone) {
    dom.installBanner.classList.add("hidden");
    dom.pushEnableBar.classList.remove("hidden");
    updatePushButtonState();
  } else {
    // Only show install banner on mobile/iOS so desktop enterprise view stays clean
    if (isIosDevice()) {
      dom.installBanner.classList.remove("hidden");
    }
  }

  dom.btnEnableAlerts.addEventListener("click", handleEnableAlertsTap);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "OPEN_INCIDENT" && event.data.incident_id) {
        openIncidentDetail(event.data.incident_id, true);
      }
    });
  }
}

function updatePushButtonState() {
  if (!("Notification" in window)) {
    dom.pushStatusTitle.textContent = "Push Not Available on This Browser";
    dom.btnEnableAlerts.disabled = true;
    dom.btnEnableAlerts.textContent = "Unavailable";
    return;
  }

  if (Notification.permission === "denied") {
    dom.pushStatusTitle.textContent = "Notifications Blocked";
    dom.btnEnableAlerts.disabled = true;
    dom.btnEnableAlerts.textContent = "Blocked";
  } else if (
    Notification.permission === "granted" &&
    localStorage.getItem("blimblom_push_registered") === "1"
  ) {
    dom.pushStatusTitle.textContent = "Push Alerts Enabled";
    dom.btnEnableAlerts.textContent = "Alerts Active ✓";
  }
}

async function handleEnableAlertsTap() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    showToast("Push notifications require an installed PWA on iOS 16.4+ or modern browser.");
    return;
  }

  dom.btnEnableAlerts.disabled = true;
  dom.btnEnableAlerts.textContent = "Enabling...";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      showToast("Notification permission was not granted.");
      dom.btnEnableAlerts.disabled = false;
      dom.btnEnableAlerts.textContent = t("btn_enable_alerts");
      updatePushButtonState();
      return;
    }

    if (!isConfigReady() || !isVapidReady()) {
      showToast(
        getCurrentLang() === "en"
          ? "Notification permission granted! Add FIREBASE_CONFIG & VAPID_KEY in .env to enable live FCM."
          : "อนุญาตการแจ้งเตือนสำเร็จ! สามารถใส่ FIREBASE_CONFIG และ VAPID_KEY ใน .env เพื่อเชื่อม FCM จริง"
      );
      dom.btnEnableAlerts.disabled = false;
      dom.btnEnableAlerts.textContent = t("btn_enable_alerts");
      return;
    }

    const supported = await isMessagingSupported();
    if (!supported) {
      throw new Error("Firebase Cloud Messaging is not supported in this browser mode.");
    }

    const swUrl = `/firebase-messaging-sw.js?firebaseConfig=${encodeURIComponent(
      JSON.stringify(FIREBASE_CONFIG)
    )}`;
    const serviceWorkerRegistration = await navigator.serviceWorker.register(swUrl, {
      scope: "/"
    });
    await navigator.serviceWorker.ready;

    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration
    });

    if (!token) {
      throw new Error("Could not retrieve FCM registration token.");
    }

    await setDoc(doc(db, "subscribers", token), {
      token,
      created_at: serverTimestamp()
    });

    localStorage.setItem("blimblom_push_registered", "1");
    updatePushButtonState();
    showToast("Push alerts enabled for this device!");

    onMessage(messaging, (payload) => {
      const notif = payload.notification || {};
      const data = payload.data || {};
      const title = notif.title || data.title || "High-Urgency Forest Alert";
      const body = notif.body || data.alert_message_en || "";
      showToast(`${title}${body ? ": " + body : ""}`, {
        urgency: "high",
        incidentId: data.incident_id || null,
        durationMs: 8000
      });
    });
  } catch (err) {
    console.error("[Push] Error enabling alerts:", err);
    showToast(`Could not enable push alerts: ${err.message}`);
    dom.btnEnableAlerts.disabled = false;
    dom.btnEnableAlerts.textContent = t("btn_enable_alerts");
  }
}

// ----------------------------------------------------------------------------
// Simulate Sensor Event Panel (C2 — Calls Cloud Run POST /analyze)
// ----------------------------------------------------------------------------
function renderSensorButtons() {
  if (!dom.sensorButtonsGrid) return;
  dom.sensorButtonsGrid.innerHTML = "";

  for (const sensor of SENSORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sensor-btn";
    btn.dataset.sensorId = sensor.sensor_id;

    btn.innerHTML = `
      <span class="sensor-btn-icon" aria-hidden="true">${escapeHtml(sensor.icon)}</span>
      <div class="sensor-btn-meta">
        <div class="sensor-btn-top">
          <span class="sensor-id-tag">${escapeHtml(sensor.sensor_id)}</span>
          <span class="sensor-name-text">${escapeHtml(sensor.sensor_name)}</span>
        </div>
        <span class="sensor-clip-hint">${escapeHtml(sensor.expected_label)} · ${escapeHtml(
      t("sim_real_audio_tag")
    )} (${escapeHtml(sensor.audio_url.split("/").pop())})</span>
      </div>
    `;

    btn.addEventListener("click", () => handleSimulateSensor(sensor));
    dom.sensorButtonsGrid.appendChild(btn);
  }
}

function setSimulationLoadingState(loading, sensor = null) {
  isSimulating = loading;
  const buttons = document.querySelectorAll(".sensor-btn, .btn-table-simulate");
  buttons.forEach((btn) => {
    btn.disabled = loading;
  });

  if (loading && sensor) {
    dom.simulateStatusText.textContent =
      getCurrentLang() === "en"
        ? `Streaming real field audio from ${sensor.sensor_id} (${sensor.sensor_name}) to Cloud Run & Gemini AI...`
        : `กำลังส่งไฟล์เสียงจริงจาก ${sensor.sensor_id} (${sensor.sensor_name}) ไปยัง Cloud Run & Gemini AI...`;
    dom.simulateStatusBox.classList.remove("hidden");
    dom.simulateErrorBox.classList.add("hidden");
  } else {
    dom.simulateStatusBox.classList.add("hidden");
  }
}

async function handleSimulateSensor(sensor) {
  if (isSimulating) return;
  setSimulationLoadingState(true, sensor);

  // Highlight selected sensor on GIS map
  focusMapOnNode(sensor.sensor_id);

  try {
    if (dom.chkPlayOnSimulate && dom.chkPlayOnSimulate.checked) {
      playAudioClipOutLoud(sensor.audio_url);
    }

    // 1. Fetch clip as Blob and convert to base64 using FileReader.readAsDataURL
    const { audio_base64, mime_type, audio_url } = await loadSensorAudioPayload(sensor);

    // 2. Check if Cloud Run endpoint is configured
    if (!isCloudRunReady()) {
      if (!isConfigReady()) {
        // Preview mode fallback when neither Cloud Run nor Firebase is configured yet
        await new Promise((r) => setTimeout(r, 900));
        const previewDoc = buildPreviewSimulatedIncident(sensor, audio_url);
        incidents = [previewDoc, ...incidents];
        knownIncidentIds.add(previewDoc.id);
        renderIncidentsList(previewDoc.id);
        showToast(
          getCurrentLang() === "en"
            ? `✨ Gemini Analysis Complete: ${previewDoc.event_type.toUpperCase()} (${Math.round(
                previewDoc.confidence * 100
              )}% conf · ${previewDoc.urgency.toUpperCase()})`
            : `✨ Gemini วิเคราะห์สำเร็จ: ${previewDoc.event_type.toUpperCase()} (ความมั่นใจ ${Math.round(
                previewDoc.confidence * 100
              )}% · ระดับ ${previewDoc.urgency.toUpperCase()})`,
          {
            urgency: previewDoc.urgency,
            incidentId: previewDoc.id
          }
        );
        return;
      }
      throw new Error(
        "CLOUD_RUN_URL is still set to a TODO placeholder in public/js/config.js. Please paste your deployed Cloud Run URL."
      );
    }

    // 3. POST to CLOUD_RUN_URL + "/analyze"
    const endpoint = `${CLOUD_RUN_URL.replace(/\/$/, "")}/analyze`;
    const requestBody = {
      sensor_id: sensor.sensor_id,
      sensor_name: sensor.sensor_name,
      location: {
        lat: sensor.location.lat,
        lng: sensor.location.lng
      },
      audio_url,
      mime_type,
      audio_base64
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      let errDetail = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errDetail = errJson.error || errJson.message || errDetail;
      } catch (_) {
        // ignore JSON parse error
      }
      throw new Error(`Cloud Run /analyze failed (${errDetail})`);
    }

    const result = await response.json();
    const eventType = result.event_type || "unknown";
    const urgency = (result.urgency || "low").toLowerCase();

    showToast(
      `Gemini Analysis: ${eventType.toUpperCase()} (${urgency.toUpperCase()} urgency)`,
      {
        urgency,
        incidentId: result.id || null
      }
    );
  } catch (err) {
    console.error("[Simulate] Error:", err);
    dom.simulateErrorBox.textContent = err.message || "Failed to simulate sensor event.";
    dom.simulateErrorBox.classList.remove("hidden");
  } finally {
    setSimulationLoadingState(false);
  }
}

function buildPreviewSimulatedIncident(sensor, audio_url) {
  const isElephant = sensor.audio_url.includes("elephant");
  const isChainsaw = sensor.audio_url.includes("chainsaw");
  const event_type = isElephant ? "elephant" : isChainsaw ? "chainsaw" : "normal";
  const urgency = isElephant || isChainsaw ? "high" : "low";
  return {
    id: `preview-${Date.now()}`,
    sensor_id: sensor.sensor_id,
    sensor_name: sensor.sensor_name,
    location: sensor.location,
    audio_url,
    event_type,
    confidence: isElephant ? 0.95 : isChainsaw ? 0.91 : 0.96,
    urgency,
    reasoning: isElephant
      ? "ตรวจพบคลื่นความถี่ต่ำและเสียงร้องแปร๋นของช้างเอเชีย (Fundamental ~650 Hz พร้อม Harmonics ชัดเจน) บริเวณใกล้จุดติดตั้งเซนเซอร์"
      : isChainsaw
      ? "ตรวจพบคลื่นความถี่เครื่องยนต์สันดาป 2 จังหวะรอบจัด (High-RPM Chainsaw Signature) ต่อเนื่องในเขตป่าอนุรักษ์"
      : "ตรวจพบเสียงจิ้งหรีดและแมลงกลางคืนตามธรรมชาติ ไม่พบความถี่เสียงที่เป็นภัยคุกคาม",
    alert_message_en: isElephant
      ? `Wild elephant detected at ${sensor.sensor_name}. Ranger patrol advised.`
      : isChainsaw
      ? `Potential illegal logging (chainsaw) detected at ${sensor.sensor_name}.`
      : `Normal forest baseline audio at ${sensor.sensor_name}.`,
    alert_message_th: isElephant
      ? `ตรวจพบเสียงช้างป่าที่จุดเซนเซอร์ ${sensor.sensor_name} โปรดแจ้งชุดเฝ้าระวังผลักดันช้าง`
      : isChainsaw
      ? `ตรวจพบเสียงเลื่อยยนต์บริเวณ ${sensor.sensor_name} ขอให้เจ้าหน้าที่สายตรวจเข้าตรวจสอบทันที`
      : `เสียงธรรมชาติปกติที่จุด ${sensor.sensor_name} ไม่พบเหตุผิดปกติ`,
    status: "new",
    created_at: null
  };
}

// ----------------------------------------------------------------------------
// SECTION 2: Early Warning Feed (Live Alert List — C3)
// ----------------------------------------------------------------------------
function getFilteredIncidents() {
  if (activeFilter === "high") {
    return incidents.filter((inc) => getUrgencyClass(inc.urgency) === "high");
  }
  if (activeFilter === "active") {
    return incidents.filter((inc) => (inc.status || "new").toLowerCase() !== "resolved");
  }
  return incidents;
}

function updateFilterCountsAndKpis() {
  const allCount = incidents.length;
  const highCount = incidents.filter((i) => getUrgencyClass(i.urgency) === "high").length;
  const activeCount = incidents.filter(
    (i) => (i.status || "new").toLowerCase() !== "resolved"
  ).length;

  if (dom.filterCountAll) dom.filterCountAll.textContent = String(allCount);
  if (dom.filterCountHigh) dom.filterCountHigh.textContent = String(highCount);
  if (dom.filterCountActive) dom.filterCountActive.textContent = String(activeCount);
  if (dom.kpiHighCount) dom.kpiHighCount.textContent = String(highCount);

  if (dom.kpiAvgConfidence && incidents.length > 0) {
    const avg =
      incidents.reduce((acc, cur) => acc + formatConfidencePercent(cur.confidence), 0) /
      incidents.length;
    dom.kpiAvgConfidence.textContent = `${Math.round(avg)}%`;
  }
}

function renderIncidentsList(newlyAddedId = null) {
  dom.incidentsLoading.classList.add("hidden");
  updateFilterCountsAndKpis();
  const isEn = getCurrentLang() === "en";

  const filtered = getFilteredIncidents();
  dom.incidentCountBadge.textContent = String(filtered.length);

  if (filtered.length === 0) {
    dom.incidentsEmpty.classList.remove("hidden");
    dom.incidentsList.innerHTML = "";
    return;
  }

  dom.incidentsEmpty.classList.add("hidden");
  dom.incidentsList.innerHTML = "";

  for (const inc of filtered) {
    const urgencyKey = getUrgencyClass(inc.urgency);
    const statusKey = (inc.status || "new").toLowerCase();
    const confPct = formatConfidencePercent(inc.confidence);

    const row = document.createElement("div");
    row.className = `incident-row urgency-border-${urgencyKey}${
      inc.id === newlyAddedId ? " new-incident-flash" : ""
    }`;
    row.setAttribute("role", "listitem");
    row.tabIndex = 0;

    const previewTextEn =
      inc.alert_message_en || inc.reasoning || "Acoustic event recorded.";
    const previewTextTh = inc.alert_message_th || "";
    const primaryAlert = isEn ? previewTextEn : previewTextTh || previewTextEn;
    const secondaryAlert = isEn ? previewTextTh : previewTextEn;

    row.innerHTML = `
      <div class="row-top">
        <div class="row-event-group">
          <span class="event-icon" aria-hidden="true">${getEventIcon(inc.event_type)}</span>
          <span class="event-type-label">${escapeHtml(inc.event_type || "unknown")}</span>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F3F8F5] dark:bg-emerald-950 text-[#143328] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            AI ${confPct}%
          </span>
        </div>
        <div class="row-badges">
          <span class="status-badge status-${escapeHtml(statusKey)}">${escapeHtml(
      formatStatusLabel(statusKey)
    )}</span>
          <span class="urgency-badge urgency-${urgencyKey}">${escapeHtml(urgencyKey)}</span>
        </div>
      </div>

      <div class="row-meta">
        <span class="font-semibold text-slate-700 dark:text-slate-300">📍 ${escapeHtml(
          inc.sensor_id ? `${inc.sensor_id} · ` : ""
        )}${escapeHtml(inc.sensor_name || "Unknown Sensor")}</span>
        <span class="text-slate-500 dark:text-slate-400" data-ts="${
          timestampToMillis(inc.created_at) || ""
        }">${escapeHtml(formatRelativeTime(inc.created_at))}</span>
      </div>

      <p class="row-preview font-semibold">${escapeHtml(primaryAlert)}</p>
      ${
        secondaryAlert && secondaryAlert !== primaryAlert
          ? `<p class="row-preview-th">${escapeHtml(secondaryAlert)}</p>`
          : ""
      }

      <div class="row-actions-bar">
        <button type="button" class="btn-inline-audio px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition">
          ${escapeHtml(t("btn_evidence_audio"))}
        </button>
        <div class="flex items-center gap-1.5">
          ${
            statusKey === "new"
              ? `<button type="button" class="btn-inline-ack px-3 py-1 rounded-lg bg-[#143328] hover:bg-[#1B4332] dark:bg-emerald-600 text-white text-xs font-bold transition shadow-2xs">
                  ${escapeHtml(t("btn_ack_short"))}
                </button>`
              : `<span class="text-xs text-[#143328] dark:text-emerald-400 font-bold">✓ ${escapeHtml(
                  formatStatusLabel(statusKey)
                )}</span>`
          }
          <button type="button" class="btn-inline-detail px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition">
            ${escapeHtml(t("btn_details"))}
          </button>
        </div>
      </div>
    `;

    // Inline Evidence Audio button
    const audioBtn = row.querySelector(".btn-inline-audio");
    if (audioBtn) {
      audioBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        playAudioClipOutLoud(inc.audio_url);
        showToast(
          isEn
            ? `Playing evidence audio: ${inc.audio_url}`
            : `กำลังเล่นเสียงหลักฐาน: ${inc.audio_url}`
        );
      });
    }

    // Inline 1-tap Acknowledge button
    const ackBtn = row.querySelector(".btn-inline-ack");
    if (ackBtn) {
      ackBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleUpdateIncidentStatus(inc.id, "acknowledged");
      });
    }

    // Clicking row or Details button opens full Incident Detail screen
    row.addEventListener("click", () => openIncidentDetail(inc.id, true));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openIncidentDetail(inc.id, true);
      }
    });

    dom.incidentsList.appendChild(row);
  }
}

// ----------------------------------------------------------------------------
// Incident Detail Screen & Status Actions (C4)
// ----------------------------------------------------------------------------
async function openIncidentDetail(incidentId, pushHistory = true) {
  if (!incidentId) return;
  activeIncidentId = incidentId;

  if (pushHistory) {
    const nextUrl = `${window.location.pathname}?incident=${encodeURIComponent(incidentId)}`;
    if (window.location.search !== `?incident=${encodeURIComponent(incidentId)}`) {
      window.history.pushState({ incidentId }, "", nextUrl);
    }
  }

  dom.listView.classList.add("hidden");
  dom.detailView.classList.remove("hidden");
  dom.detailIdLabel.textContent = `ID: ${incidentId}`;

  let inc = incidents.find((item) => item.id === incidentId);

  if (!inc && db) {
    dom.detailCard.innerHTML = `
      <div class="empty-state">
        <div class="spinner spinner-lg"></div>
        <p class="empty-title">Loading incident ${escapeHtml(incidentId)}...</p>
      </div>
    `;
    try {
      const snap = await getDoc(doc(db, "incidents", incidentId));
      if (snap.exists()) {
        inc = { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.error("[Detail] Error loading incident document:", err);
    }
  }

  if (!inc) {
    dom.detailCard.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3 class="empty-title">Incident Not Found</h3>
        <p class="empty-desc">Could not find incident with ID <code>${escapeHtml(
          incidentId
        )}</code>.</p>
      </div>
    `;
    return;
  }

  renderIncidentDetailCard(inc);
}

function renderIncidentDetailCard(inc) {
  const urgencyKey = getUrgencyClass(inc.urgency);
  const statusKey = (inc.status || "new").toLowerCase();
  const confidencePct = formatConfidencePercent(inc.confidence);
  const lat = inc.location && typeof inc.location.lat === "number" ? inc.location.lat : null;
  const lng = inc.location && typeof inc.location.lng === "number" ? inc.location.lng : null;
  const coordsText =
    lat !== null && lng !== null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Unknown coordinates";
  const mapsUrl =
    lat !== null && lng !== null
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`
      : null;
  const audioSrc = normalizeAudioUrl(inc.audio_url);

  dom.detailCard.innerHTML = `
    <div class="detail-header">
      <div class="detail-title-row">
        <h2 class="detail-event-title">
          <span aria-hidden="true">${getEventIcon(inc.event_type)}</span>
          <span>${escapeHtml(inc.event_type || "Unknown")} Incident</span>
        </h2>
        <div class="row-badges">
          <span class="status-badge status-${escapeHtml(statusKey)}">${escapeHtml(
    formatStatusLabel(statusKey)
  )}</span>
          <span class="urgency-badge urgency-${urgencyKey}">${escapeHtml(
    urgencyKey
  )} PRIORITY</span>
        </div>
      </div>

      <div class="detail-meta-grid">
        <div class="meta-item">
          <span class="meta-label">${escapeHtml(t("detail_station"))}</span>
          <span class="meta-value">${escapeHtml(
            inc.sensor_id ? `${inc.sensor_id} · ` : ""
          )}${escapeHtml(inc.sensor_name || "Unknown Sensor")}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">${escapeHtml(t("detail_time"))}</span>
          <span class="meta-value">${escapeHtml(
            formatRelativeTime(inc.created_at)
          )}</span>
          <span style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(
            formatFullTimestamp(inc.created_at)
          )}</span>
        </div>
        <div class="meta-item" style="grid-column: 1 / -1;">
          <span class="meta-label">${escapeHtml(t("detail_gps"))}</span>
          <span class="meta-value">${escapeHtml(coordsText)}</span>
          ${
            mapsUrl
              ? `<a class="map-link" href="${escapeHtml(
                  mapsUrl
                )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                  t("detail_open_maps")
                )}</a>`
              : ""
          }
        </div>
      </div>
    </div>

    <div class="alert-messages-box">
      <div class="alert-box-primary">
        <span class="box-caption">${escapeHtml(t("detail_alert_th_label"))}</span>
        <p class="alert-text-en">${escapeHtml(
          inc.alert_message_th || "ไม่มีข้อความแจ้งเตือนภาษาไทย"
        )}</p>
      </div>
      <div class="alert-box-secondary">
        <span class="box-caption">${escapeHtml(t("detail_alert_en_label"))}</span>
        <p class="alert-text-th">${escapeHtml(
          inc.alert_message_en || "No English alert message provided."
        )}</p>
      </div>
    </div>

    <div class="audio-section">
      <span class="box-caption">${escapeHtml(t("detail_audio_label"))} (${escapeHtml(
    inc.audio_url || "N/A"
  )})</span>
      ${
        audioSrc
          ? `<audio class="audio-player" controls preload="metadata" src="${escapeHtml(
              audioSrc
            )}">Your browser does not support the audio element.</audio>`
          : `<p class="reasoning-text">No audio clip URL attached to this incident.</p>`
      }
    </div>

    <div class="analysis-section">
      <div class="confidence-row">
        <span class="box-caption" style="margin: 0;">${escapeHtml(
          t("detail_conf_label")
        )}</span>
        <span class="confidence-pct">${confidencePct}%</span>
      </div>
      <div class="confidence-bar-track" aria-hidden="true">
        <div class="confidence-bar-fill" style="width: ${confidencePct}%;"></div>
      </div>
      <div>
        <span class="box-caption">${escapeHtml(t("detail_reasoning_label"))}</span>
        <p class="reasoning-text">${escapeHtml(
          inc.reasoning || "No reasoning provided."
        )}</p>
      </div>
    </div>

    <div class="status-actions-section">
      <span class="box-caption">${escapeHtml(t("detail_status_heading"))}</span>
      <div class="status-buttons-grid">
        <button type="button" class="btn btn-status ${
          statusKey === "acknowledged" ? "active-status" : ""
        }" data-status="acknowledged">
          ${escapeHtml(t("status_btn_ack"))}
        </button>
        <button type="button" class="btn btn-status ${
          statusKey === "en_route" ? "active-status" : ""
        }" data-status="en_route">
          ${escapeHtml(t("status_btn_enroute"))}
        </button>
        <button type="button" class="btn btn-status ${
          statusKey === "resolved" ? "active-status" : ""
        }" data-status="resolved">
          ${escapeHtml(t("status_btn_resolved"))}
        </button>
      </div>
      <div id="statusUpdateError" class="error-banner hidden" role="alert"></div>
    </div>
  `;

  const statusButtons = dom.detailCard.querySelectorAll(".btn-status");
  statusButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetStatus = btn.dataset.status;
      handleUpdateIncidentStatus(inc.id, targetStatus);
    });
  });
}

async function handleUpdateIncidentStatus(incidentId, newStatus) {
  const errBox = document.getElementById("statusUpdateError");
  const buttons = dom.detailCard.querySelectorAll(".btn-status");
  if (errBox) errBox.classList.add("hidden");

  buttons.forEach((b) => {
    b.disabled = true;
  });

  try {
    if (!db || !isConfigReady()) {
      const target = incidents.find((i) => i.id === incidentId);
      if (target) {
        target.status = newStatus;
        if (activeIncidentId === incidentId) {
          renderIncidentDetailCard(target);
        }
        renderIncidentsList();
        showToast(
          getCurrentLang() === "en"
            ? `Updated ranger status to "${formatStatusLabel(newStatus)}"`
            : `อัปเดตสถานะเป็น "${formatStatusLabel(newStatus)}" เรียบร้อยแล้ว`
        );
      }
      return;
    }

    // Update ONLY the "status" field in Firestore (strictly required by Firestore security rules)
    const incidentRef = doc(db, "incidents", incidentId);
    await updateDoc(incidentRef, {
      status: newStatus
    });

    const target = incidents.find((i) => i.id === incidentId);
    if (target) {
      target.status = newStatus;
      if (activeIncidentId === incidentId) {
        renderIncidentDetailCard(target);
      }
      renderIncidentsList();
    }
    showToast(
      getCurrentLang() === "en"
        ? `Updated ranger status to "${formatStatusLabel(newStatus)}"`
        : `อัปเดตสถานะเป็น "${formatStatusLabel(newStatus)}" เรียบร้อยแล้ว`
    );
  } catch (err) {
    console.error("[Status Update] Failed:", err);
    if (errBox) {
      errBox.textContent = `Could not update status: ${
        err.message || "Permission denied or network error."
      }`;
      errBox.classList.remove("hidden");
    }
    buttons.forEach((b) => {
      b.disabled = false;
    });
  }
}

function closeIncidentDetail(pushHistory = true) {
  activeIncidentId = null;
  dom.detailView.classList.add("hidden");
  dom.listView.classList.remove("hidden");

  const audioEl = dom.detailCard.querySelector("audio");
  if (audioEl) {
    audioEl.pause();
  }

  if (pushHistory && window.location.search.includes("incident=")) {
    window.history.pushState({}, "", window.location.pathname);
  }
}

// ----------------------------------------------------------------------------
// Clean 4-Page Navigation Switcher (Zero Clutter)
// ----------------------------------------------------------------------------
function switchActivePage(view) {
  const buttons = document.querySelectorAll(".nav-view-btn");
  buttons.forEach((b) => {
    if (b.dataset.view === view) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });

  const mobileRangerBanner = document.getElementById("mobileRangerAppBanner");
  closeIncidentDetail(true);

  if (view === "map-alerts") {
    mobileRangerBanner?.classList.add("hidden");
    dom.kpiSummarySection?.classList.remove("hidden");
    dom.sectionMapAndAlerts?.classList.remove("hidden");
    dom.mapColumnCard?.classList.remove("hidden");
    dom.alertColumnCard?.classList.remove("hidden");
    dom.alertColumnCard?.classList.remove("lg:col-span-12", "max-w-xl", "mx-auto", "w-full");
    dom.alertColumnCard?.classList.add("lg:col-span-5");
    dom.sectionAnalytics?.classList.add("hidden");
    dom.sectionHardware?.classList.add("hidden");
    setTimeout(() => leafletMap?.invalidateSize(), 120);
  } else if (view === "analytics") {
    mobileRangerBanner?.classList.add("hidden");
    dom.kpiSummarySection?.classList.remove("hidden");
    dom.sectionMapAndAlerts?.classList.add("hidden");
    dom.sectionAnalytics?.classList.remove("hidden");
    dom.sectionHardware?.classList.add("hidden");
  } else if (view === "hardware") {
    mobileRangerBanner?.classList.add("hidden");
    dom.kpiSummarySection?.classList.add("hidden");
    dom.sectionMapAndAlerts?.classList.add("hidden");
    dom.sectionAnalytics?.classList.add("hidden");
    dom.sectionHardware?.classList.remove("hidden");
  } else if (view === "mobile-ranger") {
    // Focused Mobile Ranger App View (Page B on iPhone / Android)
    mobileRangerBanner?.classList.remove("hidden");
    dom.kpiSummarySection?.classList.add("hidden");
    dom.simulatorDrawer?.classList.add("hidden");
    dom.sectionMapAndAlerts?.classList.remove("hidden");
    dom.mapColumnCard?.classList.add("hidden");
    dom.alertColumnCard?.classList.remove("hidden", "lg:col-span-5");
    dom.alertColumnCard?.classList.add("lg:col-span-12", "max-w-xl", "mx-auto", "w-full");
    dom.sectionAnalytics?.classList.add("hidden");
    dom.sectionHardware?.classList.add("hidden");
  }
}

function initSectionViewSwitcher() {
  const buttons = document.querySelectorAll(".nav-view-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view || "map-alerts";
      switchActivePage(view);
    });
  });

  const btnMobileRangerPush = document.getElementById("btnMobileRangerPush");
  if (btnMobileRangerPush) {
    btnMobileRangerPush.addEventListener("click", handleEnableAlertsTap);
  }
}

// ----------------------------------------------------------------------------
// Firestore Real-Time Listener Initialization
// ----------------------------------------------------------------------------
function initFirestoreConnection() {
  if (!isConfigReady()) {
    dom.configNoticeBanner.classList.remove("hidden");
    dom.connectionBadge.className = "conn-badge conn-preview";
    dom.connectionText.textContent = "Demo Mode";

    incidents = [...PREVIEW_INCIDENTS];
    incidents.forEach((i) => knownIncidentIds.add(i.id));
    renderIncidentsList();
    checkInitialDeepLink();
    return;
  }

  try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(firebaseApp);

    const incidentsQuery = query(
      collection(db, "incidents"),
      orderBy("created_at", "desc"),
      limit(50)
    );

    onSnapshot(
      incidentsQuery,
      (snapshot) => {
        dom.connectionBadge.className = "conn-badge conn-live";
        dom.connectionText.textContent = "Live · Firestore";

        let newlyArrivedId = null;
        const nextList = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const item = {
            id: docSnap.id,
            ...data
          };
          if (!isInitialSnapshot && !knownIncidentIds.has(item.id)) {
            newlyArrivedId = item.id;
          }
          knownIncidentIds.add(item.id);
          nextList.push(item);
        });

        incidents = nextList;
        renderIncidentsList(newlyArrivedId);

        if (activeIncidentId) {
          const updatedActive = incidents.find((i) => i.id === activeIncidentId);
          if (updatedActive) {
            renderIncidentDetailCard(updatedActive);
          }
        }

        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          checkInitialDeepLink();
        }
      },
      (err) => {
        console.error("[Firestore] onSnapshot error:", err);
        dom.connectionBadge.className = "conn-badge conn-preview";
        dom.connectionText.textContent = "Firestore Error";
        dom.incidentsLoading.classList.add("hidden");
        dom.simulateErrorBox.textContent = `Firestore listener error: ${err.message}`;
        dom.simulateErrorBox.classList.remove("hidden");
      }
    );
  } catch (err) {
    console.error("[Firebase Init] Error:", err);
    dom.connectionBadge.className = "conn-badge conn-preview";
    dom.connectionText.textContent = "Init Error";
  }
}

function checkInitialDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  if (mode === "ranger" || isRunningStandalone()) {
    switchActivePage("mobile-ranger");
  }
  const incidentId = params.get("incident");
  if (incidentId) {
    openIncidentDetail(incidentId, false);
  }
}

// ----------------------------------------------------------------------------
// Bootstrap Application
// ----------------------------------------------------------------------------
function initApp() {
  initThemeToggle();
  renderSensorButtons();
  initLeafletGisMap();
  renderDeviceRegistryTable();
  initAnalyticsCharts();
  initAiAssistantChat();
  initInstallAndPushFlow();
  initSectionViewSwitcher();
  initFirestoreConnection();
  initLanguageSwitcher();

  if (dom.btnToggleSimulate && dom.simulateBody) {
    dom.btnToggleSimulate.addEventListener("click", () => {
      const isHidden = dom.simulateBody.classList.toggle("hidden");
      dom.btnToggleSimulate.textContent = isHidden
        ? t("sim_btn_show")
        : t("sim_btn_hide");
    });
  }

  if (dom.btnOpenSimulatorModal && dom.simulatorDrawer) {
    dom.btnOpenSimulatorModal.addEventListener("click", () => {
      dom.simulatorDrawer.classList.remove("hidden");
      dom.simulateBody?.classList.remove("hidden");
      if (dom.btnToggleSimulate) dom.btnToggleSimulate.textContent = t("sim_btn_hide");
      dom.simulatorDrawer.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (dom.btnExportCsv) {
    dom.btnExportCsv.addEventListener("click", exportCsvDataset);
  }
  if (dom.btnExportJson) {
    dom.btnExportJson.addEventListener("click", exportJsonDataset);
  }

  // Filter Pills
  const filterPills = document.querySelectorAll(".filter-pill");
  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeFilter = pill.dataset.filter || "all";
      renderIncidentsList();
    });
  });

  dom.btnBackToList.addEventListener("click", () => closeIncidentDetail(true));
  dom.headerHomeLink.addEventListener("click", () => {
    switchActivePage("map-alerts");
  });

  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const incidentId = params.get("incident");
    if (incidentId) {
      openIncidentDetail(incidentId, false);
    } else {
      closeIncidentDetail(false);
    }
  });

  // Refresh relative timestamps ("2 min ago") every 30 seconds
  setInterval(() => {
    if (!activeIncidentId && incidents.length > 0) {
      renderIncidentsList();
    }
  }, 30000);
}

initApp();
