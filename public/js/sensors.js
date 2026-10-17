// ============================================================================
// BlimBlom — Forest Hardware Sensor Nodes (Kui Buri Acoustic & Telemetry Mesh)
// ============================================================================

export const SENSORS = [
  {
    sensor_id: "S01",
    sensor_name: "Kui Buri North Gate",
    location: { lat: 12.16, lng: 99.53 },
    audio_url: "audio/elephant_1.mp3",
    expected_label: "Elephant Trumpet #1",
    hardware_node: "Edge Acoustic Node · Solar v2",
    telemetry_summary: "27.1°C · 74% RH · 380 Lux",
    icon: "🐘"
  },
  {
    sensor_id: "S02",
    sensor_name: "Ban Rai Farm Edge",
    location: { lat: 12.14, lng: 99.55 },
    audio_url: "audio/elephant_2.mp3",
    expected_label: "Elephant Approach #2",
    hardware_node: "Crop-Border Acoustic + IR Bridge",
    telemetry_summary: "27.8°C · 71% RH · 510 Lux",
    icon: "🐘"
  },
  {
    sensor_id: "S03",
    sensor_name: "Deep Forest East",
    location: { lat: 12.20, lng: 99.58 },
    audio_url: "audio/chainsaw_1.wav",
    expected_label: "Chainsaw / Logging",
    hardware_node: "Canopy Acoustic Array",
    telemetry_summary: "25.9°C · 82% RH · 420 Lux",
    icon: "🪚"
  },
  {
    sensor_id: "S04",
    sensor_name: "Stream Bank",
    location: { lat: 12.12, lng: 99.50 },
    audio_url: "audio/crickets_1.wav",
    expected_label: "Normal Forest (Crickets)",
    hardware_node: "Riparian Bio-Acoustic Node",
    telemetry_summary: "24.8°C · 88% RH · 190 Lux",
    icon: "🦗"
  }
];

/**
 * Determine MIME type strictly from file extension (.mp3 -> audio/mp3, .wav -> audio/wav).
 */
export function getMimeTypeFromUrl(audioUrl) {
  const lower = (audioUrl || "").toLowerCase();
  if (lower.endsWith(".wav")) {
    return "audio/wav";
  }
  return "audio/mp3";
}

/**
 * Safely convert a Blob to a base64 string using FileReader.readAsDataURL
 * and stripping the "data:...;base64," prefix.
 * (Avoids String.fromCharCode(...bytes) which crashes the call stack on large audio clips.)
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read audio file as Data URL."));
        return;
      }
      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) {
        reject(new Error("Invalid Data URL format when encoding audio."));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => {
      reject(new Error("FileReader failed while encoding audio clip."));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch a bundled sensor audio clip and return { audio_base64, mime_type, audio_url }.
 */
export async function loadSensorAudioPayload(sensor) {
  const cleanPath = (sensor.audio_url || "").replace(/^\/+/, "");
  const normalizedUrl = `./${cleanPath}?v=real2026`;

  const response = await fetch(normalizedUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Could not load audio file "${sensor.audio_url}" (HTTP ${response.status}). Make sure the clip is placed inside public/audio/.`
    );
  }

  const blob = await response.blob();
  const audio_base64 = await blobToBase64(blob);
  const mime_type = getMimeTypeFromUrl(sensor.audio_url);

  return {
    audio_base64,
    mime_type,
    audio_url: sensor.audio_url
  };
}
