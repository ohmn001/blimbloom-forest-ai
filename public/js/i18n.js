// ============================================================================
// BLIMBLOOM — Bilingual Localization Module (Thai / English i18n)
// ============================================================================
// Provides a complete dictionary and helper functions to switch the entire
// BLIMBLOOM Enterprise & Mobile Ranger UI between Thai ('th') and English ('en').
//
// Usage:
//   - HTML elements with `data-i18n="key"` have their textContent updated.
//   - HTML elements with `data-i18n-placeholder="key"` have their placeholder updated.
//   - Dynamic JS templates call `t("key")` or `getCurrentLang()` when rendering.
// ============================================================================

const STORAGE_KEY = "blimbloom_lang";

/**
 * Complete translation dictionary for Thai (th) and English (en).
 */
export const TRANSLATIONS = {
  th: {
    // Header & Navigation
    brand_subtitle: "ระบบเฝ้าระวังและฐานข้อมูลนิเวศป่าไม้ด้วย AI แห่งประเทศไทย",
    nav_tab_map: "1. แผนที่และแจ้งเตือนภัย (GIS & Alerts)",
    nav_tab_analytics: "2. ข้อมูลวิจัย & คาร์บอน (Big Data & ESG)",
    nav_tab_hardware: "3. อุปกรณ์ & สถานะระบบ (Hardware)",
    nav_tab_ranger: "4. แอปเจ้าหน้าที่ (Ranger App)",
    nav_mob_map: "🗺️ 1. แผนที่ & แจ้งเตือน",
    nav_mob_analytics: "📊 2. Big Data & ESG",
    nav_mob_hardware: "🔌 3. อุปกรณ์เซนเซอร์",
    nav_mob_ranger: "📱 4. แอปเจ้าหน้าที่",
    bottom_nav_alerts: "แจ้งเตือนด่วน",
    bottom_nav_map: "แผนที่ป่า",
    bottom_nav_analytics: "ข้อมูลวิจัย",
    bottom_nav_hardware: "เซนเซอร์",
    btn_simulate_top: "จำลองส่งเสียงเซนเซอร์ (Simulate)",

    // System Banners
    demo_badge: "โหมดสาธิต (Demo Mode)",
    demo_desc:
      "ระบบพร้อมจำลองเสียงจริงและวิเคราะห์อัตโนมัติ หากต้องการเชื่อม Cloud Run & Firestore จริง ให้ใส่ค่าใน .env แล้วรัน npm run env:sync",
    pwa_install_title: "ติดตั้งแอป BLIMBLOOM ลงบนหน้าจอมือถือ (PWA)",
    pwa_install_desc:
      "บน iPhone Safari: กดปุ่ม แชร์ (Share ↑) แล้วเลือก เพิ่มไปยังหน้าจอโฮม (Add to Home Screen ＋) เพื่อรับแจ้งเตือนฉุกเฉิน",
    btn_install_app: "ติดตั้งแอป",
    btn_hide_banner: "ซ่อนแถบนี้",
    push_bar_title: "ระบบแจ้งเตือนฉุกเฉินสำหรับเจ้าหน้าที่ (FCM Push)",
    push_bar_desc:
      "รับการแจ้งเตือนทันทีเมื่อเซนเซอร์ตรวจพบเสียงช้างป่าหรือเลื่อยยนต์ (High Priority)",
    btn_enable_alerts: "เปิดการแจ้งเตือน",

    // Sensor Simulator (Page A)
    sim_badge: "หน้า A · Sensor Simulator",
    sim_title:
      "จำลองการส่งเสียงจากเซนเซอร์ในป่า (Sensor → Cloud Run /analyze → Gemini AI → แจ้งเตือน)",
    sim_subtitle:
      "กดเลือกจุดเซนเซอร์ด้านล่างเพื่อส่งไฟล์เสียงจริงไปวิเคราะห์ และดูผลลัพธ์เด้งขึ้นบนแผนที่ประเทศไทยและรายการแจ้งเตือนทันที",
    sim_play_sound: "🔊 เปิดเสียงออกลำโพงเมื่อกด",
    sim_btn_hide: "พับเก็บ ▲",
    sim_btn_show: "กางออก ▼",
    sim_sending_sub:
      "กำลังจำแนกคลื่นความถี่เสียง คำนวณ % ความมั่นใจ และประเมินความเร่งด่วน...",
    sim_real_audio_tag: "เสียงจริง",

    // KPI Summary Cards
    kpi_nodes_label: "เครือข่ายเซนเซอร์ในพื้นที่ป่า",
    kpi_nodes_val: "6 โหนด",
    kpi_nodes_badge: "ออนไลน์ 100%",
    kpi_nodes_sub: "อุทยานแห่งชาติกุยบุรี จ.ประจวบคีรีขันธ์",
    kpi_high_label: "แจ้งเตือนภัยคุกคามระดับสูง (High)",
    kpi_high_avg_prefix: "ความแม่นยำ AI เฉลี่ย",
    kpi_high_sub: "ตรวจจับช้างป่า & เลื่อยยนต์ตัดไม้",
    kpi_carbon_label: "คาร์บอนเครดิตป่าไม้ที่ปกป้องได้",
    kpi_carbon_sub: "รองรับมาตรฐาน ESG / CSR ระดับองค์กร",
    kpi_modalities_label: "ข้อมูลระบบนิเวศแบบ Multimodal",
    kpi_modalities_unit: "มิติข้อมูล",
    kpi_modalities_sub: "เสียง · ภาพ · อัลตราโซนิก · อุณหภูมิ · ความชื้น · แสง",

    // Section 1: Thailand GIS Map
    map_badge: "🇹🇭 Thailand Forest GIS Network",
    map_title: "แผนที่เครือข่ายเซนเซอร์เฝ้าระวังระบบนิเวศ (Real-Time)",
    map_subtitle:
      "คลิกที่สัญลักษณ์เซนเซอร์ (🐘 ช้างป่า · 🪚 เลื่อยยนต์ · 🦗 ธรรมชาติ · 📷 กล้อง AI · 🦇 ค้างคาว) เพื่อดูค่าสภาพอากาศและฟังเสียงสด",
    zone_kuiburi: "📍 อุทยานแห่งชาติกุยบุรี จ.ประจวบคีรีขันธ์ (6 โหนด)",
    zone_thailand: "🇹🇭 แผนที่ภาพรวมประเทศไทย (Thailand Overview)",
    zone_khaoyai: "🌳 อุทยานแห่งชาติเขาใหญ่ จ.นครราชสีมา",
    zone_huaikhakhaeng: "🐅 เขตรักษาพันธุ์สัตว์ป่าห้วยขาแข้ง จ.อุทัยธานี",
    map_style_clear: "แผนที่ประเทศไทย (ชัดเจน)",
    map_style_sat: "ภาพถ่ายดาวเทียม",
    heatmap_on: "จุดเสี่ยง: เปิด",
    heatmap_off: "จุดเสี่ยง: ปิด",
    legend_normal: "ปกติ (3)",
    legend_alert: "แจ้งเตือนภัย (2)",
    legend_lowbat: "แบตเตอรี่ต่ำ (1)",

    // Telemetry Card
    node_status_alert: "🟠 แจ้งเตือนภัยคุกคาม",
    node_status_lowbat: "🔴 แบตเตอรี่ต่ำ",
    node_status_normal: "🟢 ทำงานปกติ",
    node_role_label: "หน้าที่หลัก:",
    node_hw_label: "อุปกรณ์:",
    node_temp_label: "🌡️ อุณหภูมิ (Temp)",
    node_rh_label: "💧 ความชื้น (RH)",
    node_lux_label: "☀️ ความเข้มแสง",
    node_ultra_label: "🦇 อัลตราโซนิก",
    node_last_sound: "สถานะเสียงล่าสุด:",
    btn_listen_sensor: "▶ ฟังเสียงจากเซนเซอร์",
    btn_trigger_gemini: "⚡ ส่งให้ Gemini วิเคราะห์",

    // Section 2: Early Warning Feed
    mobile_ranger_sub: "ระบบรับแจ้งเตือนภัยคุกคามและสั่งการชุดลาดตระเวนภาคสนาม",
    btn_mobile_push: "🔔 เปิดแจ้งเตือน",
    feed_title: "รายการแจ้งเตือนภัยคุกคามล่าสุด (Real-Time)",
    feed_subtitle: "ลำดับตามความเร่งด่วน · กดฟังเสียงหลักฐานและสั่งการเจ้าหน้าที่ได้ทันที",
    filter_all: "ทั้งหมด",
    filter_high: "🔴 ด่วนมาก (High)",
    filter_active: "⏳ รอดำเนินการ",
    feed_loading: "กำลังเชื่อมต่อฐานข้อมูลแจ้งเตือนแบบ Real-time...",
    feed_empty_title: "ไม่มีรายการแจ้งเตือนในหมวดหมู่นี้",
    feed_empty_desc:
      "เหตุการณ์ในป่าปกติ สามารถกดปุ่มจำลองเซนเซอร์ด้านบนเพื่อทดสอบระบบแจ้งเตือนได้ทันที",
    btn_evidence_audio: "▶ ฟังเสียงหลักฐาน",
    btn_ack_short: "✓ รับทราบเหตุ (Ack)",
    btn_details: "รายละเอียด →",
    btn_back_dashboard: "← กลับไปหน้าแดชบอร์ด (Back to Dashboard)",

    // Detail View
    detail_station: "สถานีเซนเซอร์ (Sensor Station)",
    detail_time: "เวลาที่ตรวจพบ (Detected Time)",
    detail_gps: "พิกัดดาวเทียม (GPS Coordinates)",
    detail_open_maps: "📍 เปิดดูพิกัดใน Google Maps ↗",
    detail_alert_th_label: "ข้อความแจ้งเตือนเจ้าหน้าที่ (ภาษาไทย)",
    detail_alert_en_label: "ข้อความแจ้งเตือนภาษาอังกฤษ (English Alert)",
    detail_audio_label: "ไฟล์เสียงหลักฐานที่บันทึกได้จากเซนเซอร์",
    detail_conf_label: "ผลวิเคราะห์คลื่นเสียงด้วย Gemini AI · ความมั่นใจ (Confidence)",
    detail_reasoning_label: "เหตุผลประกอบการตัดสินใจของ AI (AI Reasoning)",
    detail_status_heading: "อัปเดตสถานะการปฏิบัติงานของเจ้าหน้าที่ (Update Ranger Status)",
    status_btn_ack: "✓ Acknowledge (รับทราบ)",
    status_btn_enroute: "🏃 On the way (กำลังเข้าพื้นที่)",
    status_btn_resolved: "🛡️ Resolved (ระงับเหตุแล้ว)",

    // Section 3: Big Data & ESG Analytics
    analytics_sponsor_tag:
      "💼 สำหรับผู้สนับสนุนองค์กร · สนามบิน · WWF / UN · สถาบันวิจัย",
    analytics_title:
      "การวิเคราะห์ความสัมพันธ์ข้อมูลหลายมิติ และดัชนีคาร์บอนเครดิตป่าไม้",
    analytics_subtitle:
      "รวบรวมข้อมูลเสียง ภาพถ่าย อัลตราโซนิก อุณหภูมิ ความชื้น และแสงสว่าง เพื่อสร้างมูลค่าข้อมูลระบบนิเวศ (Ecosystem Data Valuation)",
    btn_export_csv: "ดาวน์โหลด Dataset (CSV)",
    btn_export_json: "Export API JSON",
    chart1_title: "ความสัมพันธ์ของอุณหภูมิ/ความชื้น ต่อการออกหากินของช้างป่า (24 ชม.)",
    chart1_sub: "พบความสัมพันธ์ชัดเจนเมื่อความชื้นในป่าลดต่ำลงในช่วงค่ำ",
    chart2_title: "ปริมาณข้อมูลที่จัดเก็บแยกตามชนิดเซนเซอร์ (6 มิติ)",
    chart2_sub: "จำนวนชุดข้อมูลที่ส่งเข้า Cloud Data Lake ต่อวัน",
    chart2_badge: "48.2k รายการ/วัน",
    esg_card_title: "รายงานความยั่งยืน (ESG Impact)",
    esg_score_label: "ดัชนีความสมบูรณ์ของผืนป่า",
    esg_row_carbon: "🌳 คาร์บอนสะสมที่ปกป้องได้",
    esg_row_aci: "🦇 ดัชนีความหลากหลายทางเสียง",
    esg_row_logging: "🪚 ป้องกันการลักลอบตัดไม้",
    esg_row_logging_val: "18 ครั้งในปีนี้",
    esg_row_crop: "🐘 ลดความเสียหายพืชผลเกษตร",
    esg_footer_note:
      "ใช้เป็นหลักฐานตรวจสอบย้อนกลับ (Auditable Metrics) สำหรับองค์กรที่ต้องการสนับสนุนคาร์บอนเครดิตและอนุรักษ์ความหลากหลายทางชีวภาพ",

    // Section 4: Hardware & Cloud Health
    hw_title:
      "ทะเบียนอุปกรณ์เซนเซอร์ภาคสนาม และสถานะการเชื่อมต่อ Cloud Microservices",
    hw_subtitle:
      "รองรับการเชื่อมต่อกับฮาร์ดแวร์เดิมของอุทยานฯ (ESP32, Raspberry Pi, กล้องดักถ่าย CCTV, Ultrasonic) เข้าสู่ Google Cloud Run",
    health_ready: "พร้อมใช้งาน",
    health_online: "ออนไลน์",
    health_synced: "ซิงค์ข้อมูลสด",
    th_col_device: "รหัสโหนด & จุดติดตั้ง",
    th_col_platform: "ฮาร์ดแวร์ (Hardware Platform)",
    th_col_sensors: "เซนเซอร์ที่เชื่อมต่อ (Modalities)",
    th_col_protocol: "โปรโตคอลส่งข้อมูล",
    th_col_battery: "ระดับแบตเตอรี่ / โซลาร์เซลล์",
    th_col_status: "สถานะ",
    th_col_action: "การจัดการ",
    tbl_btn_sim: "⚡ ทดสอบส่งเสียง",
    tbl_btn_map: "🗺️ ดูบนแผนที่",

    // Section 5: AI Assistant
    ai_sub: "ถาม-ตอบข้อมูลเชิงลึกระบบนิเวศด้วยภาษาธรรมชาติ",
    ai_chip_elephant: "🐘 สรุปเหตุช้างบุกรุกเดือนนี้",
    ai_chip_fire: "🔥 พื้นที่เสี่ยงความชื้นต่ำ/ไฟป่า",
    ai_chip_chainsaw: "🪚 สร้าง Report เลื่อยยนต์ส่งตำรวจ",
    ai_welcome:
      "สวัสดีครับ! ผมเชื่อมต่อกับฐานข้อมูล Ecosystem Big Data ของอุทยานแห่งชาติในประเทศไทยแล้ว กดปุ่มคำถามตัวอย่างด้านบน หรือพิมพ์ถามเกี่ยวกับข้อมูลสัตว์ป่า อุณหภูมิ ความชื้น หรือรายงานสรุปได้เลยครับ",
    ai_input_placeholder: "พิมพ์คำถามเกี่ยวกับข้อมูลระบบนิเวศ...",
    ai_btn_send: "ส่งคำถาม"
  },

  en: {
    // Header & Navigation
    brand_subtitle: "Thailand Forest Ecosystem AI & Early Warning Command Center",
    nav_tab_map: "1. GIS Map & Live Alerts",
    nav_tab_analytics: "2. Big Data & ESG Analytics",
    nav_tab_hardware: "3. Hardware & System Health",
    nav_tab_ranger: "4. Mobile Ranger App",
    nav_mob_map: "🗺️ 1. GIS & Alerts",
    nav_mob_analytics: "📊 2. Big Data & ESG",
    nav_mob_hardware: "🔌 3. Hardware",
    nav_mob_ranger: "📱 4. Ranger App",
    bottom_nav_alerts: "Live Alerts",
    bottom_nav_map: "Forest Map",
    bottom_nav_analytics: "Analytics",
    bottom_nav_hardware: "Sensors",
    btn_simulate_top: "Simulate Sensor Audio",

    // System Banners
    demo_badge: "Interactive Demo Mode",
    demo_desc:
      "Ready to simulate real acoustic events and AI analysis. To connect live Cloud Run & Firestore, add keys to .env and run npm run env:sync.",
    pwa_install_title: "Install BLIMBLOOM on Your Home Screen (PWA)",
    pwa_install_desc:
      "On iPhone Safari: tap Share (↑) then Add to Home Screen (＋) to receive instant field ranger push notifications.",
    btn_install_app: "Install App",
    btn_hide_banner: "Dismiss",
    push_bar_title: "Field Ranger Emergency Push Alerts (FCM)",
    push_bar_desc:
      "Receive immediate mobile alerts when high-urgency elephant or chainsaw events are detected.",
    btn_enable_alerts: "Enable alerts",

    // Sensor Simulator (Page A)
    sim_badge: "Page A · Sensor Simulator",
    sim_title:
      "Simulate Forest Sensor Audio Pipeline (Sensor → Cloud Run /analyze → Gemini AI → Alert)",
    sim_subtitle:
      "Click any sensor preset below to transmit real audio to POST /analyze and watch the Thailand GIS map and alert feed update live.",
    sim_play_sound: "🔊 Play sound on click",
    sim_btn_hide: "Hide ▲",
    sim_btn_show: "Show ▼",
    sim_sending_sub:
      "Analyzing acoustic signature, confidence score, and ranger dispatch priority...",
    sim_real_audio_tag: "Real Audio",

    // KPI Summary Cards
    kpi_nodes_label: "Active Forest Sensor Nodes",
    kpi_nodes_val: "6 Nodes",
    kpi_nodes_badge: "100% Online",
    kpi_nodes_sub: "Kui Buri National Park · Prachuap Khiri Khan",
    kpi_high_label: "High-Priority Threat Alerts",
    kpi_high_avg_prefix: "Avg AI Conf:",
    kpi_high_sub: "Wild Elephant & Chainsaw Detections",
    kpi_carbon_label: "Forest Carbon Stock Protected",
    kpi_carbon_sub: "Verified for Corporate ESG / CSR Audits",
    kpi_modalities_label: "Multimodal Ecosystem Streams",
    kpi_modalities_unit: "Modalities",
    kpi_modalities_sub: "Audio · Image · Ultrasonic · Temp · RH · Lux",

    // Section 1: Thailand GIS Map
    map_badge: "🇹🇭 Thailand Forest GIS Network",
    map_title: "Real-Time Ecosystem Sensor Network Map",
    map_subtitle:
      "Click any sensor marker (🐘 Elephant · 🪚 Chainsaw · 🦗 Crickets · 📷 AI Cam · 🦇 Bat Sonar) to inspect live microclimate telemetry and audio.",
    zone_kuiburi: "📍 Kui Buri National Park, Prachuap Khiri Khan (6 Nodes)",
    zone_thailand: "🇹🇭 Thailand National Network Overview",
    zone_khaoyai: "🌳 Khao Yai National Park, Nakhon Ratchasima",
    zone_huaikhakhaeng: "🐅 Huai Kha Khaeng Wildlife Sanctuary, Uthai Thani",
    map_style_clear: "Thailand Terrain Map",
    map_style_sat: "Satellite Imagery",
    heatmap_on: "Threat Heatmap: ON",
    heatmap_off: "Threat Heatmap: OFF",
    legend_normal: "Normal (3)",
    legend_alert: "Alerting (2)",
    legend_lowbat: "Low Battery (1)",

    // Telemetry Card
    node_status_alert: "🟠 Alert Active",
    node_status_lowbat: "🔴 Low Battery",
    node_status_normal: "🟢 Online",
    node_role_label: "Primary Role:",
    node_hw_label: "Hardware:",
    node_temp_label: "🌡️ Temperature",
    node_rh_label: "💧 Humidity (RH)",
    node_lux_label: "☀️ Light Intensity",
    node_ultra_label: "🦇 Ultrasonic",
    node_last_sound: "Latest Acoustic Event:",
    btn_listen_sensor: "▶ Listen Audio",
    btn_trigger_gemini: "⚡ Analyze with Gemini",

    // Section 2: Early Warning Feed
    mobile_ranger_sub: "Real-time wildlife conflict & illegal logging dispatch unit",
    btn_mobile_push: "🔔 Enable Alerts",
    feed_title: "Real-Time Threat Stream",
    feed_subtitle: "Sorted by urgency · Listen to audio evidence & dispatch rangers",
    filter_all: "All Alerts",
    filter_high: "🔴 High Priority",
    filter_active: "⏳ Unresolved",
    feed_loading: "Connecting to real-time Firestore alert stream...",
    feed_empty_title: "No Alerts in This View",
    feed_empty_desc:
      "All quiet for the selected filter. Use the Sensor Simulator above to trigger a live detection.",
    btn_evidence_audio: "▶ Evidence Audio",
    btn_ack_short: "✓ Acknowledge",
    btn_details: "Details →",
    btn_back_dashboard: "← Back to Dashboard",

    // Detail View
    detail_station: "Sensor Station",
    detail_time: "Detected Time",
    detail_gps: "GPS Coordinates",
    detail_open_maps: "📍 Open in Google Maps ↗",
    detail_alert_th_label: "Local Ranger Alert (Thai · ข้อความแจ้งเตือนภาษาไทย)",
    detail_alert_en_label: "Ranger Alert (English)",
    detail_audio_label: "Captured Sensor Audio Evidence",
    detail_conf_label: "Gemini Acoustic Analysis · Confidence",
    detail_reasoning_label: "AI Reasoning",
    detail_status_heading: "Update Ranger Response Status",
    status_btn_ack: "✓ Acknowledge",
    status_btn_enroute: "🏃 On the way",
    status_btn_resolved: "🛡️ Resolved",

    // Section 3: Big Data & ESG Analytics
    analytics_sponsor_tag:
      "💼 Enterprise & ESG Sponsors · Airports · WWF / UN · Research Universities",
    analytics_title:
      "Multi-Sensor Correlation & Forest Carbon Credit Integrity",
    analytics_subtitle:
      "Fusing Acoustic, Image, Ultrasonic, Temperature, Humidity & Light streams into structured datasets for ESG audits and AI models.",
    btn_export_csv: "Export Dataset (CSV)",
    btn_export_json: "Export API JSON",
    chart1_title: "Temperature & Humidity vs. Elephant Vocalizations (24h)",
    chart1_sub: "Strong correlation when forest relative humidity drops in the evening",
    chart2_title: "Daily Telemetry Volume by Sensor Modality (6 Streams)",
    chart2_sub: "Structured data points ingested into Cloud Data Lake per day",
    chart2_badge: "48.2k pts/day",
    esg_card_title: "ESG Impact Verification",
    esg_score_label: "Forest Integrity Score",
    esg_row_carbon: "🌳 Verified Carbon Stock",
    esg_row_aci: "🦇 Bio-Acoustic Richness",
    esg_row_logging: "🪚 Illegal Logging Prevented",
    esg_row_logging_val: "18 Events YTD",
    esg_row_crop: "🐘 Crop Damage Reduction",
    esg_footer_note:
      "Provides auditable biodiversity and forest protection metrics for corporate carbon offsets, airports, and conservation funds.",

    // Section 4: Hardware & Cloud Health
    hw_title: "Connected Field Device Registry & Cloud Microservices",
    hw_subtitle:
      "Seamless integration with existing national park hardware (ESP32, Raspberry Pi, CCTV TrailCams, Ultrasonic) streaming to Google Cloud Run.",
    health_ready: "Healthy",
    health_online: "Online",
    health_synced: "Live Sync",
    th_col_device: "Device ID & Location",
    th_col_platform: "Hardware Platform",
    th_col_sensors: "Integrated Modalities",
    th_col_protocol: "Protocol",
    th_col_battery: "Battery / Solar",
    th_col_status: "Status",
    th_col_action: "Action",
    tbl_btn_sim: "⚡ Simulate Audio",
    tbl_btn_map: "🗺️ View on Map",

    // Section 5: AI Assistant
    ai_sub: "Ask questions about Thailand's Forest Ecosystem Big Data",
    ai_chip_elephant: "🐘 Summarize elephant intrusions",
    ai_chip_fire: "🔥 Low humidity & wildfire risk zones",
    ai_chip_chainsaw: "🪚 Generate chainsaw report for police",
    ai_welcome:
      "Hello! I am connected to BLIMBLOOM's Thailand Forest Ecosystem Big Data Lake. Click a suggested prompt above or ask about wildlife activity, microclimate trends, or incident reports.",
    ai_input_placeholder: "Ask Gemini about the ecosystem data...",
    ai_btn_send: "Send"
  }
};

// Current active language ('th' or 'en')
let currentLang = localStorage.getItem(STORAGE_KEY) || "th";

/**
 * Get current active language code ('th' | 'en').
 */
export function getCurrentLang() {
  return currentLang;
}

/**
 * Translate a key into the active language.
 */
export function t(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.th;
  return dict[key] ?? TRANSLATIONS.th[key] ?? key;
}

/**
 * Set the active language ('th' | 'en'), persist to localStorage, and update DOM elements
 * that carry `data-i18n` or `data-i18n-placeholder` attributes.
 */
export function setLanguage(lang) {
  currentLang = lang === "en" ? "en" : "th";
  localStorage.setItem(STORAGE_KEY, currentLang);
  document.documentElement.lang = currentLang;

  // Update all elements with [data-i18n]
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      el.textContent = t(key);
    }
  });

  // Update all input placeholders with [data-i18n-placeholder]
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) {
      el.setAttribute("placeholder", t(key));
    }
  });
}
