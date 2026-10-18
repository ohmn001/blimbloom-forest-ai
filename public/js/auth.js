// ============================================================================
// BlimBlom · Accounts (login / register / 6-digit device PIN / forgot password)
// - Firebase mode: Firebase Authentication (email + password) + Firestore users/{uid}
// - Demo mode (no Firebase config): accounts kept in this browser only
// - PIN: PBKDF2-SHA256 + random salt, stored on this device only, never uploaded
// - Forgot password: OTP is SIMULATED (shown on screen). In Firebase mode the real
//   password change happens through Firebase's own reset email, because a code the
//   browser invents cannot be trusted to change a real account's password.
// ============================================================================

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getCurrentLang } from "./i18n.js?v9";

// ---------------------------------------------------------------------------
// Text (TH / EN)
// ---------------------------------------------------------------------------
const TXT = {
  th: {
    brand_tag: "ระบบเตือนภัยป่าด้วยเสียง · กุยบุรี",
    brand_h: "ฟังเสียงป่า<br>ถึงเจ้าหน้าที่ก่อนใคร",
    brand_p: "บัญชีเดียวใช้ได้ทุกอุปกรณ์ ข้อมูลโปรไฟล์ สถานะปฏิบัติงาน และการตั้งค่าแจ้งเตือน ตามคุณไปตั้งแต่คอมพิวเตอร์ที่สถานีจนถึงมือถือในป่า",
    brand_s1: "ฟังเซนเซอร์", brand_s2: "Gemini วิเคราะห์", brand_s3: "ปลดล็อกเร็ว",
    brand_foot: "Google Cloud AI Builder Cup 2026 · ทีม BlimBlom",
    secure_foot: "ปกป้องด้วย Firebase Authentication · PIN ไม่ออกจากเครื่องนี้",
    demo_foot: "โหมดเดโม · บัญชีถูกเก็บในเบราว์เซอร์นี้เท่านั้น",
    login_h: "ยินดีต้อนรับกลับ", login_p: "เข้าสู่ระบบเพื่อดูการแจ้งเตือนสดและงานลาดตระเวนของคุณ",
    tab_email: "อีเมล", tab_phone: "เบอร์โทร",
    email: "อีเมล", password: "รหัสผ่าน", phone: "เบอร์โทร", forgot_link: "ลืมรหัสผ่าน?",
    phone_note: "การเข้าสู่ระบบด้วย SMS ต้องใช้ Firebase Phone Auth (เวอร์ชันใช้งานจริง) ในเดโมนี้กรุณาใช้อีเมล",
    keep: "จดจำการเข้าสู่ระบบในอุปกรณ์นี้", login_btn: "เข้าสู่ระบบ", or: "หรือ",
    guest_btn: "ดูแดชบอร์ดโดยไม่เข้าสู่ระบบ", new_q: "เจ้าหน้าที่ใหม่?", create_link: "สร้างบัญชี",
    reg_label: "สร้างบัญชี", reg_h: "เข้าร่วมเครือข่ายลาดตระเวน", reg_p: "โปรไฟล์ถูกบันทึกไว้กับบัญชี เปิดจากอุปกรณ์ไหนก็เจอข้อมูลเดิม",
    name: "ชื่อ-นามสกุล", station: "สถานี / พื้นที่", agency: "หน่วยงาน", agency_ph: "กรมอุทยานแห่งชาติฯ",
    consent: "ยินยอมให้แสดงชื่อและเบอร์โทรแก่ทีมลาดตระเวนเพื่อใช้แจ้งเตือน",
    reg_btn: "สร้างบัญชี", have_q: "มีบัญชีแล้ว?", login_link: "เข้าสู่ระบบ",
    pw_weak: "อ่อน", pw_ok: "พอใช้", pw_good: "ดี", pw_strong: "แข็งแรง", pw_hint: "อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข",
    setpin_label: "ปลดล็อกด่วน", setpin_h: "ตั้ง PIN 6 หลัก", setpin_p: "ใช้เปิด BlimBlom ในอุปกรณ์นี้โดยไม่ต้องพิมพ์รหัสผ่าน PIN ถูกเก็บไว้ในเครื่องนี้เท่านั้น",
    setpin_1: "กรอก PIN 6 หลัก", setpin_2: "ยืนยัน PIN อีกครั้ง", setpin_step1: "ขั้นที่ 1 จาก 2", setpin_step2: "ขั้นที่ 2 จาก 2 · กรอกเลขเดิมอีกครั้ง",
    setpin_mismatch: "PIN ไม่ตรงกัน ลองใหม่อีกครั้ง", later: "ไว้ทีหลัง", pin_saved: "ตั้ง PIN เรียบร้อยแล้ว",
    pin_welcome: "ยินดีต้อนรับกลับ", pin_enter: "กรอก PIN ของคุณ", pin_wrong: "PIN ไม่ถูกต้อง · เหลืออีก {n} ครั้ง",
    pin_locked: "ใส่ PIN ผิดครบ 5 ครั้ง กรุณาเข้าสู่ระบบด้วยรหัสผ่าน", use_password: "ใช้รหัสผ่าน", not_you: "ไม่ใช่คุณ? ออกจากระบบ",
    on_duty: "ปฏิบัติงาน", off_duty: "ไม่ได้ปฏิบัติงาน",
    reset_label: "รีเซ็ตรหัสผ่าน", forgot_h: "ลืมรหัสผ่าน?", forgot_p: "กรอกอีเมลของบัญชี เราจะส่งรหัส 6 หลักให้",
    send_by: "ส่งรหัสทาง", ch_email: "อีเมล", ch_sms: "SMS", sms_unknown: "เบอร์โทรที่ผูกกับบัญชี",
    demo_note: "โหมดเดโม: ไม่มีการส่งอีเมลหรือ SMS จริง รหัสจะแสดงในหน้าถัดไป", send_code: "ส่งรหัส", back_login: "กลับไปหน้าเข้าสู่ระบบ",
    otp_banner_email: "รหัสเดโม · อีเมลจำลอง", otp_banner_sms: "รหัสเดโม · SMS จำลอง", now: "เมื่อสักครู่",
    otp_h: "กรอกรหัส 6 หลัก", otp_sent: "ส่งไปที่ {to}", expires: "หมดอายุใน {t}", expired: "รหัสหมดอายุแล้ว",
    resend_in: "ส่งใหม่ได้ใน {t}", resend: "ส่งรหัสใหม่", otp_rule: "ถ้ากรอกผิด 3 ครั้ง หรือเกิน 5 นาที รหัสจะใช้ไม่ได้ และขอรหัสใหม่ได้",
    verify: "ยืนยัน", otp_wrong: "รหัสไม่ถูกต้อง · เหลืออีก {n} ครั้ง", otp_dead: "รหัสนี้ใช้ไม่ได้แล้ว กรุณาขอรหัสใหม่",
    switch_sms: "ส่งทาง SMS แทน", switch_email: "ส่งทางอีเมลแทน", resend_max: "ขอรหัสใหม่ครบ 3 ครั้งแล้ว",
    verified: "ยืนยันรหัสแล้ว", newpw_h: "ตั้งรหัสผ่านใหม่", newpw_p: "เมื่อบันทึกแล้วคุณจะเข้าสู่ระบบทันที และตั้ง PIN ใหม่ในอุปกรณ์นี้ได้",
    newpw: "รหัสผ่านใหม่", newpw2: "ยืนยันรหัสผ่านใหม่", r_len: "อย่างน้อย 8 ตัวอักษร", r_mix: "มีทั้งตัวอักษรและตัวเลข", r_match: "รหัสผ่านตรงกัน",
    save_signin: "บันทึกและเข้าสู่ระบบ",
    fb_reset_h: "ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว",
    fb_reset_p: "ยืนยันตัวตนสำเร็จ ระบบ Firebase ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ {to} แล้ว เปิดลิงก์นั้นเพื่อตั้งรหัสผ่านใหม่ แล้วกลับมาเข้าสู่ระบบ",
    fb_reset_why: "เหตุผล: รหัส OTP ในเดโมสร้างจากเบราว์เซอร์ จึงไม่ปลอดภัยพอจะเปลี่ยนรหัสผ่านบัญชีจริงได้โดยตรง",
    err_email: "กรุณากรอกอีเมลให้ถูกต้อง", err_pw: "กรุณากรอกรหัสผ่าน", err_name: "กรุณากรอกชื่อ-นามสกุล", err_phone: "กรุณากรอกเบอร์โทรให้ถูกต้อง",
    err_pw_rule: "รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีทั้งตัวอักษรและตัวเลข", err_pw_match: "รหัสผ่านทั้งสองช่องไม่ตรงกัน", err_consent: "กรุณากดยินยอมก่อนสร้างบัญชี",
    err_login: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", err_exists: "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ", err_no_account: "ไม่พบบัญชีของอีเมลนี้",
    err_many: "ลองหลายครั้งเกินไป กรุณารอสักครู่", err_net: "เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ต",
    err_provider: "ยังไม่ได้เปิด Email/Password ใน Firebase Console › Authentication › Sign-in method",
    welcome_toast: "เข้าสู่ระบบแล้ว · {name}", logout_toast: "ออกจากระบบแล้ว", created_toast: "สร้างบัญชีเรียบร้อย",
    close: "ปิด", back: "ย้อนกลับ", delete: "ลบ"
  },
  en: {
    brand_tag: "Forest acoustic early warning · Kui Buri",
    brand_h: "Hear the forest.<br>Reach the ranger first.",
    brand_p: "One account for every device. Your profile, duty status and alert settings follow you from the station PC to your phone in the field.",
    brand_s1: "Sensor listening", brand_s2: "Gemini analysis", brand_s3: "Quick unlock",
    brand_foot: "Google Cloud AI Builder Cup 2026 · Team BlimBlom",
    secure_foot: "Secured by Firebase Authentication · PIN never leaves this device",
    demo_foot: "Demo mode · accounts are kept in this browser only",
    login_h: "Welcome back", login_p: "Log in to see live alerts and your patrol queue.",
    tab_email: "Email", tab_phone: "Phone number",
    email: "Email", password: "Password", phone: "Phone number", forgot_link: "Forgot password?",
    phone_note: "SMS sign-in needs Firebase Phone Auth (production). Please use email for this demo.",
    keep: "Keep me signed in on this device", login_btn: "Log in", or: "or",
    guest_btn: "View the dashboard without logging in", new_q: "New ranger?", create_link: "Create an account",
    reg_label: "Create account", reg_h: "Join the patrol network", reg_p: "Your profile is saved to your account, so it is there on every device.",
    name: "Full name", station: "Station / area", agency: "Agency / unit", agency_ph: "Dept. of National Parks",
    consent: "I agree my name and phone are shared with my patrol team for alerts.",
    reg_btn: "Create account", have_q: "Already registered?", login_link: "Log in",
    pw_weak: "Weak", pw_ok: "Fair", pw_good: "Good", pw_strong: "Strong", pw_hint: "8+ characters, letters and numbers",
    setpin_label: "Quick unlock", setpin_h: "Set a 6-digit PIN", setpin_p: "Use it to open BlimBlom on this device without typing your password. It is stored only on this device.",
    setpin_1: "Choose a 6-digit PIN", setpin_2: "Confirm your PIN", setpin_step1: "Step 1 of 2", setpin_step2: "Step 2 of 2 · enter the same 6 digits again",
    setpin_mismatch: "PINs did not match. Try again.", later: "Later", pin_saved: "PIN saved on this device",
    pin_welcome: "Welcome back,", pin_enter: "Enter your PIN", pin_wrong: "Wrong PIN · {n} tries left",
    pin_locked: "5 wrong PIN attempts. Please log in with your password.", use_password: "Use password", not_you: "Not you? Log out",
    on_duty: "On duty", off_duty: "Off duty",
    reset_label: "Reset password", forgot_h: "Forgot your password?", forgot_p: "Enter the email on your account. We will send a 6-digit code.",
    send_by: "Send the code by", ch_email: "Email", ch_sms: "SMS", sms_unknown: "Phone on your account",
    demo_note: "Demo mode: no real email or SMS is sent. The code appears on the next screen.", send_code: "Send code", back_login: "Back to log in",
    otp_banner_email: "Demo code · simulated email", otp_banner_sms: "Demo code · simulated SMS", now: "now",
    otp_h: "Enter the 6-digit code", otp_sent: "Sent to {to}", expires: "Expires in {t}", expired: "Code expired",
    resend_in: "Resend in {t}", resend: "Resend code", otp_rule: "After 3 wrong tries, or after 5 minutes, the code stops working and you can request a new one.",
    verify: "Verify", otp_wrong: "Wrong code · {n} tries left", otp_dead: "This code no longer works. Request a new one.",
    switch_sms: "Send by SMS instead", switch_email: "Send by email instead", resend_max: "You have used all 3 resends.",
    verified: "Code verified", newpw_h: "Create a new password", newpw_p: "You will be signed in right away and can set a new PIN on this device.",
    newpw: "New password", newpw2: "Confirm new password", r_len: "At least 8 characters", r_mix: "Letters and numbers", r_match: "Passwords match",
    save_signin: "Save and sign in",
    fb_reset_h: "Reset link sent",
    fb_reset_p: "Identity confirmed. Firebase has sent a password-reset link to {to}. Open it to choose a new password, then come back and log in.",
    fb_reset_why: "Why: the demo OTP is created in the browser, so it is not trusted to change a real account's password directly.",
    err_email: "Please enter a valid email.", err_pw: "Please enter your password.", err_name: "Please enter your full name.", err_phone: "Please enter a valid phone number.",
    err_pw_rule: "Password needs 8+ characters with letters and numbers.", err_pw_match: "The two passwords do not match.", err_consent: "Please tick the consent box first.",
    err_login: "Wrong email or password.", err_exists: "This email already has an account. Try logging in.", err_no_account: "No account found for this email.",
    err_many: "Too many attempts. Please wait a moment.", err_net: "Can't connect. Check your internet.",
    err_provider: "Email/Password is not enabled in Firebase Console › Authentication › Sign-in method.",
    welcome_toast: "Signed in · {name}", logout_toast: "Signed out", created_toast: "Account created",
    close: "Close", back: "Back", delete: "Delete"
  }
};
const L = () => (getCurrentLang() === "en" ? "en" : "th");
const tx = (k, vars) => {
  let s = TXT[L()][k] ?? TXT.en[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${a}}`, b);
  return s;
};
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const PIN_MAX_FAILS = 5;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_TRIES = 3;
const OTP_MAX_RESENDS = 3;
const LOCK_AFTER_HIDDEN_MS = 60 * 1000;
const LS_ACCOUNTS = "bb_local_accounts";
const LS_SESSION = "bb_local_session";
const SS_PIN_SKIP = "bb_pin_skip";
const SS_GUEST = "bb_guest";
const LS_LAST = "bb_last_user";

let mode = "local"; // "firebase" | "local"
let auth = null;
let fdb = null;
let user = null; // { uid, email, name }
let profile = null; // users/{uid}
let hooks = { onChange: () => {}, toast: () => {}, stations: () => [] };
let root = null;
let view = null; // current view name or null when closed
let locked = false;
let dismissible = true;
let firstAuthEvent = true;
let justSignedIn = false;
let pinBuf = "";
let pinFirst = "";
let pinMsg = "";
let loginTab = "email";
let forgotState = { email: "", channel: "email", code: "", issued: 0, tries: 0, resends: 0, phone: "" };
let otpTimer = null;
let hiddenAt = 0;
let unlockedUid = null;
let firstRoute = true;

export const getAuthUser = () => user;
export const getAuthProfile = () => profile;
export const isAuthDemo = () => mode === "local";

// ---------------------------------------------------------------------------
// Crypto helpers (PBKDF2-SHA256)
// ---------------------------------------------------------------------------
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function pbkdf2(secret, saltB64, iterations = 120000) {
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  if (!(window.crypto && crypto.subtle)) {
    // Non-secure context fallback (should not happen on https)
    let h = 2166136261;
    for (const ch of saltB64 + secret) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return `fnv_${(h >>> 0).toString(16)}`;
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return b64(bits);
}
function newSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return b64(a);
}
function randomDigits(n) {
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => String(x % 10)).join("");
}
const lsGet = (k, fb = null) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch (_) {
    return fb;
  }
};
const lsSet = (k, v) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch (_) {}
};
const ssGet = (k) => {
  try {
    return sessionStorage.getItem(k);
  } catch (_) {
    return null;
  }
};
const ssSet = (k, v) => {
  try {
    if (v === null) sessionStorage.removeItem(k);
    else sessionStorage.setItem(k, v);
  } catch (_) {}
};

// ---------------------------------------------------------------------------
// Device PIN
// ---------------------------------------------------------------------------
const pinKey = (uid) => `bb_pin_${uid}`;
const getPinRec = () => (user ? lsGet(pinKey(user.uid)) : null);
export const hasPin = () => Boolean(getPinRec());
async function savePin(pin) {
  const salt = newSalt();
  lsSet(pinKey(user.uid), { salt, hash: await pbkdf2(pin, salt), fails: 0 });
}
function clearPin(uid = user?.uid) {
  if (uid) lsSet(pinKey(uid), null);
}

// ---------------------------------------------------------------------------
// Local (demo) accounts
// ---------------------------------------------------------------------------
const localAccounts = () => lsGet(LS_ACCOUNTS, {});
function localSessionUid() {
  try {
    return localStorage.getItem(LS_SESSION) || sessionStorage.getItem(LS_SESSION);
  } catch (_) {
    return null;
  }
}
function setLocalSession(uid, keep) {
  try {
    localStorage.removeItem(LS_SESSION);
    sessionStorage.removeItem(LS_SESSION);
    if (uid) (keep ? localStorage : sessionStorage).setItem(LS_SESSION, uid);
  } catch (_) {}
}
function localUserByUid(uid) {
  const acc = Object.values(localAccounts()).find((a) => a.uid === uid);
  return acc || null;
}

// ---------------------------------------------------------------------------
// Profile (users/{uid})
// ---------------------------------------------------------------------------
const PROFILE_KEYS = ["name", "phone", "email", "role", "agency", "station", "line_id", "on_duty", "lang", "theme"];
function cleanProfile(p) {
  const out = {};
  for (const k of PROFILE_KEYS) {
    if (p[k] === undefined) continue;
    out[k] = k === "on_duty" ? !!p[k] : String(p[k]).slice(0, k === "agency" || k === "name" || k === "email" ? 80 : 60);
  }
  return out;
}
async function loadProfile() {
  if (!user) return (profile = null);
  if (mode === "firebase") {
    try {
      const snap = await getDoc(doc(fdb, "users", user.uid));
      profile = snap.exists() ? snap.data() : { name: user.name || "", email: user.email };
    } catch (err) {
      console.warn("[Auth] profile load failed:", err);
      profile = { name: user.name || "", email: user.email };
    }
  } else {
    const acc = localUserByUid(user.uid) || {};
    profile = { ...(acc.profile || {}), email: acc.email };
  }
  lsSet(LS_LAST, { uid: user.uid, name: profile.name || user.name || "", station: profile.station || "", phone: profile.phone || "" });
  return profile;
}
export async function saveAuthProfile(partial) {
  if (!user) return;
  const data = cleanProfile(partial);
  profile = { ...(profile || {}), ...data };
  if (mode === "firebase") {
    await setDoc(doc(fdb, "users", user.uid), { ...data, updated_at: serverTimestamp() }, { merge: true });
  } else {
    const accs = localAccounts();
    const key = Object.keys(accs).find((k) => accs[k].uid === user.uid);
    if (key) {
      accs[key].profile = { ...(accs[key].profile || {}), ...data };
      lsSet(LS_ACCOUNTS, accs);
    }
  }
}

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------
function fbError(err) {
  const c = String(err?.code || "");
  if (/invalid-credential|wrong-password|invalid-login|user-not-found|invalid-email/.test(c)) return tx("err_login");
  if (c.includes("email-already-in-use")) return tx("err_exists");
  if (c.includes("too-many-requests")) return tx("err_many");
  if (c.includes("network")) return tx("err_net");
  if (c.includes("operation-not-allowed") || c.includes("configuration-not-found")) return tx("err_provider");
  return err?.message || String(err);
}
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const pwOk = (p) => p.length >= 8 && /[A-Za-z฀-๿]/.test(p) && /[0-9]/.test(p);
const phoneOk = (p) => /^[0-9+\-\s()]{6,20}$/.test(p);

async function doLogin(email, password, keep) {
  if (mode === "firebase") {
    await setPersistence(auth, keep ? browserLocalPersistence : browserSessionPersistence);
    justSignedIn = true;
    await signInWithEmailAndPassword(auth, email, password);
    return;
  }
  const acc = localAccounts()[email.toLowerCase()];
  if (!acc) throw { code: "auth/invalid-credential" };
  if ((await pbkdf2(password, acc.pw.salt)) !== acc.pw.hash) throw { code: "auth/invalid-credential" };
  setLocalSession(acc.uid, keep);
  await applyUser({ uid: acc.uid, email: acc.email, name: acc.profile?.name || "" }, true);
}

async function doRegister(f) {
  const prof = cleanProfile({
    name: f.name,
    phone: f.phone,
    email: f.email,
    agency: f.agency,
    station: f.station,
    role: "",
    line_id: "",
    on_duty: true,
    lang: L(),
    theme: document.documentElement.classList.contains("dark") ? "dark" : "light"
  });
  if (mode === "firebase") {
    await setPersistence(auth, browserLocalPersistence);
    justSignedIn = true;
    const cred = await createUserWithEmailAndPassword(auth, f.email, f.password);
    try {
      await updateProfile(cred.user, { displayName: f.name });
    } catch (_) {}
    await setDoc(doc(fdb, "users", cred.user.uid), { ...prof, created_at: serverTimestamp(), updated_at: serverTimestamp() }, { merge: true });
    profile = prof;
    hooks.onChange(user, profile, { registered: true });
    return;
  }
  const accs = localAccounts();
  const key = f.email.toLowerCase();
  if (accs[key]) throw { code: "auth/email-already-in-use" };
  const salt = newSalt();
  const uid = `L${randomDigits(10)}${Date.now().toString(36)}`.replace(/[^A-Za-z0-9]/g, "");
  accs[key] = { uid, email: f.email, pw: { salt, hash: await pbkdf2(f.password, salt) }, profile: prof };
  lsSet(LS_ACCOUNTS, accs);
  setLocalSession(uid, true);
  await applyUser({ uid, email: f.email, name: f.name }, true, { registered: true });
}

export async function logout() {
  const uid = user?.uid;
  clearPin(uid);
  lsSet(LS_LAST, null);
  ssSet(SS_PIN_SKIP, null);
  if (mode === "firebase") {
    await signOut(auth);
  } else {
    setLocalSession(null);
    await applyUser(null, false);
  }
  hooks.toast(tx("logout_toast"));
}

async function applyUser(u, fresh, extra = {}) {
  user = u;
  if (user) {
    await loadProfile();
    if (!user.name) user.name = profile?.name || "";
  } else {
    profile = null;
  }
  hooks.onChange(user, profile, extra);
  routeAfterAuth(fresh);
}

// Decide which screen to show after an auth state change.
function routeAfterAuth(fresh) {
  const isFirst = firstRoute;
  firstRoute = false;
  if (!user) {
    // First page for visitors without a session: the login screen
    // (they can still choose "View the dashboard without logging in" for this tab).
    if (isFirst && !ssGet(SS_GUEST) && (!view || view === "pin")) {
      locked = false;
      open("login", { dismissible: true });
      return;
    }
    if (locked || (view && view !== "forgot" && view !== "otp" && view !== "reset" && view !== "register")) {
      locked = false;
      if (view === "pin" || view === "setpin") open("login", { dismissible: true });
    }
    return;
  }
  if (fresh) {
    hooks.toast(tx("welcome_toast", { name: user.name || user.email }));
    if (!hasPin()) open("setpin", { dismissible: false });
    else close();
    return;
  }
  // restored session on page load
  if (hasPin() && unlockedUid !== user.uid) lock();
  else if (hasPin()) close();
  else if (!ssGet(SS_PIN_SKIP)) open("setpin", { dismissible: false });
  else close();
}

export function lock() {
  if (!user || !hasPin()) return;
  unlockedUid = null;
  locked = true;
  open("pin", { dismissible: false });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const ICON = {
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  eye: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  lock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  mail: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  sms: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
  dot: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><circle cx="12" cy="12" r="3"/></svg>',
  del: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12z"/><path d="m16 9-5 6M11 9l5 6"/></svg>'
};

function steps(n, total = 3, warm = false) {
  return `<span class="au-steps${warm ? " warm" : ""}" aria-hidden="true">${Array.from(
    { length: total },
    (_, i) => `<span class="${i < n ? "on" : ""}"></span>`
  ).join("")}</span>`;
}
function topBar(label, backTo, stepHtml = "") {
  return `<div class="au-topbar">
    <button type="button" class="au-icon-btn" data-go="${backTo}" aria-label="${esc(tx("back"))}">${ICON.back}</button>
    <span class="au-topbar-label">${esc(label)}</span>${stepHtml}
  </div>`;
}
const field = (id, label, type = "text", attrs = "") =>
  `<label class="au-field" for="${id}"><span>${label}</span><input id="${id}" type="${type}" class="au-input" ${attrs}></label>`;
const errBox = () => `<div class="au-error hidden" role="alert" id="auErr"></div>`;
const keypad = (leftKey = '<span class="au-key flat" aria-hidden="true"></span>') =>
  `<div class="au-pad">${"123456789"
    .split("")
    .map((d) => `<button type="button" class="au-key" data-key="${d}">${d}</button>`)
    .join("")}${leftKey}<button type="button" class="au-key" data-key="0">0</button><button type="button" class="au-key flat" data-key="del" aria-label="${esc(
    tx("delete")
  )}">${ICON.del}</button></div>`;
const dots = (n, err = false) =>
  `<div class="au-dots${err ? " shake" : ""}" aria-label="${n} / 6">${Array.from({ length: 6 }, (_, i) => `<span class="${i < n ? "on" : ""}"></span>`).join("")}</div>`;
const checkbox = (id, label, checked = true) =>
  `<label class="au-check"><input id="${id}" type="checkbox" ${checked ? "checked" : ""}><span class="au-box">${ICON.check}</span><span>${label}</span></label>`;

function maskEmail(e) {
  const [a, d] = String(e).split("@");
  if (!d) return e;
  return `${a.slice(0, 2)}${"•".repeat(Math.max(3, a.length - 2))}@${d}`;
}
function maskPhone(p) {
  const s = String(p || "").replace(/\s/g, "");
  return s.length >= 4 ? `${s.slice(0, 3)}-XXX-••${s.slice(-2)}` : tx("sms_unknown");
}
const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const VIEWS = {
  login() {
    return `<div class="au-hero">
        <img src="./icons/blimbloom-emblem.png" alt="BlimBlom" class="au-hero-logo">
        <span class="au-hero-h">${esc(tx("login_h"))}</span>
        <span class="au-hero-p">${esc(tx("login_p"))}</span>
      </div>
      <form class="au-form" id="auLoginForm" novalidate>
        <div class="au-head au-pc-only"><h1 class="au-h1">${esc(tx("login_h"))}</h1><p class="au-sub">${esc(tx("login_p"))}</p></div>
        <div class="au-tabs" role="tablist">
          <button type="button" role="tab" class="${loginTab === "email" ? "on" : ""}" aria-selected="${loginTab === "email"}" data-tab="email">${esc(tx("tab_email"))}</button>
          <button type="button" role="tab" class="${loginTab === "phone" ? "on" : ""}" aria-selected="${loginTab === "phone"}" data-tab="phone">${esc(tx("tab_phone"))}</button>
        </div>
        ${
          loginTab === "email"
            ? field("auEmail", esc(tx("email")), "email", 'autocomplete="email" placeholder="ranger@dnp.go.th" required') +
              `<label class="au-field" for="auPw"><span class="au-field-row"><span>${esc(tx("password"))}</span><button type="button" class="au-link warm" data-go="forgot">${esc(
                tx("forgot_link")
              )}</button></span>
              <span class="au-pw"><input id="auPw" type="password" class="au-input" autocomplete="current-password" required><button type="button" class="au-eye" data-eye="auPw" aria-label="Show password">${ICON.eye}</button></span></label>`
            : field("auPhone", esc(tx("phone")), "tel", 'placeholder="08X-XXX-XXXX" disabled') +
              `<div class="au-note">${ICON.info}<span>${esc(tx("phone_note"))}</span></div>`
        }
        ${checkbox("auKeep", esc(tx("keep")))}
        ${errBox()}
        <button type="submit" class="au-btn" ${loginTab === "phone" ? "disabled" : ""}>${esc(tx("login_btn"))}</button>
        ${
          dismissible
            ? `<div class="au-or"><span></span>${esc(tx("or"))}<span></span></div>
        <button type="button" class="au-btn ghost" data-act="guest">${esc(tx("guest_btn"))}</button>`
            : ""
        }
        <p class="au-foot-q">${esc(tx("new_q"))} <button type="button" class="au-link" data-go="register">${esc(tx("create_link"))}</button></p>
      </form>`;
  },
  register() {
    const stations = hooks.stations();
    return `${topBar(tx("reg_label"), "login", steps(1, 2))}
      <form class="au-form" id="auRegForm" novalidate>
        <div class="au-head"><h1 class="au-h1">${esc(tx("reg_h"))}</h1><p class="au-sub">${esc(tx("reg_p"))}</p></div>
        ${field("auName", esc(tx("name")) + " *", "text", 'autocomplete="name" maxlength="80" placeholder="[Ranger name]"')}
        <div class="au-two">
          ${field("auPhone", esc(tx("phone")) + " *", "tel", 'autocomplete="tel" maxlength="20" placeholder="08X-XXX-XXXX"')}
          <label class="au-field" for="auStation"><span>${esc(tx("station"))}</span><select id="auStation" class="au-input">${stations
            .map((s) => `<option value="${esc(s.value)}">${esc(s.label)}</option>`)
            .join("")}</select></label>
        </div>
        ${field("auEmail", esc(tx("email")) + " *", "email", 'autocomplete="email" placeholder="ranger@dnp.go.th"')}
        ${field("auAgency", esc(tx("agency")), "text", `maxlength="80" placeholder="${esc(tx("agency_ph"))}"`)}
        <label class="au-field" for="auPw"><span>${esc(tx("password"))} *</span>
          <span class="au-pw"><input id="auPw" type="password" class="au-input" autocomplete="new-password"><button type="button" class="au-eye" data-eye="auPw" aria-label="Show password">${ICON.eye}</button></span></label>
        <div class="au-meter" id="auMeter"><div class="au-meter-bars"><span></span><span></span><span></span><span></span></div><span class="au-meter-text">${esc(tx("pw_hint"))}</span></div>
        ${checkbox("auConsent", esc(tx("consent")), false)}
        ${errBox()}
        <button type="submit" class="au-btn">${esc(tx("reg_btn"))}</button>
        <p class="au-foot-q">${esc(tx("have_q"))} <button type="button" class="au-link" data-go="login">${esc(tx("login_link"))}</button></p>
      </form>`;
  },
  setpin() {
    const second = Boolean(pinFirst);
    return `<div class="au-topbar"><span class="au-topbar-label">${esc(tx("setpin_label"))}</span>${steps(2, 2)}</div>
      <div class="au-pinwrap">
        <div class="au-pin-head"><span class="au-tile">${ICON.lock}</span><h1 class="au-h1">${esc(tx("setpin_h"))}</h1><p class="au-sub">${esc(tx("setpin_p"))}</p></div>
        <div class="au-pin-entry">
          <span class="au-pin-label">${esc(tx(second ? "setpin_2" : "setpin_1"))}</span>
          ${dots(pinBuf.length, !!pinMsg)}
          <span class="au-pin-msg${pinMsg ? " warm" : ""}">${esc(pinMsg || tx(second ? "setpin_step2" : "setpin_step1"))}</span>
        </div>
        ${keypad()}
        <div class="au-pin-foot"><button type="button" class="au-link muted" data-act="skip-pin">${esc(tx("later"))}</button></div>
      </div>`;
  },
  pin() {
    const last = lsGet(LS_LAST, {}) || {};
    const name = profile?.name || user?.name || last.name || user?.email || "";
    const station = profile?.station || last.station || "";
    const duty = profile?.on_duty === false ? tx("off_duty") : tx("on_duty");
    const rec = getPinRec();
    const left = PIN_MAX_FAILS - (rec?.fails || 0);
    return `<div class="au-pinwrap au-pin-unlock">
        <div class="au-pin-head">
          <img src="./icons/blimbloom-emblem.png" alt="BlimBlom" class="au-pin-logo">
          <span class="au-sub" style="margin-top:6px">${esc(tx("pin_welcome"))}</span>
          <h1 class="au-h1">${esc(name)}</h1>
          ${station ? `<span class="au-chip">${esc(station)} · ${esc(duty)}</span>` : ""}
        </div>
        <div class="au-pin-entry">
          <span class="au-pin-label">${esc(tx("pin_enter"))}</span>
          ${dots(pinBuf.length, !!pinMsg)}
          <span class="au-pin-msg warm">${pinMsg ? esc(pinMsg) : rec?.fails ? esc(tx("pin_wrong", { n: left })) : "&nbsp;"}</span>
        </div>
        ${keypad()}
        <div class="au-pin-foot split">
          <button type="button" class="au-link" data-act="use-password">${esc(tx("use_password"))}</button>
          <button type="button" class="au-link muted" data-act="logout">${esc(tx("not_you"))}</button>
        </div>
      </div>`;
  },
  forgot() {
    const last = lsGet(LS_LAST, {}) || {};
    const localAcc = mode === "local" && forgotState.email ? localAccounts()[forgotState.email.toLowerCase()] : null;
    const phone = forgotState.phone || localAcc?.profile?.phone || profile?.phone || last.phone || "";
    const opt = (ch, icon, title, val) => `<button type="button" class="au-opt${forgotState.channel === ch ? " on" : ""}" data-ch="${ch}" aria-pressed="${
      forgotState.channel === ch
    }"><span class="au-opt-ic">${icon}</span><span class="au-opt-text"><b>${esc(title)}</b><span>${esc(val)}</span></span><span class="au-radio"></span></button>`;
    return `${topBar(tx("reset_label"), "login", steps(1, 3, true))}
      <form class="au-form" id="auForgotForm" novalidate>
        <div class="au-head"><h1 class="au-h1">${esc(tx("forgot_h"))}</h1><p class="au-sub">${esc(tx("forgot_p"))}</p></div>
        ${field("auEmail", esc(tx("email")), "email", `autocomplete="email" placeholder="ranger@dnp.go.th" value="${esc(forgotState.email || user?.email || "")}"`)}
        <span class="au-label">${esc(tx("send_by"))}</span>
        ${opt("email", ICON.mail, tx("ch_email"), forgotState.email ? maskEmail(forgotState.email) : "ra•••••@dnp.go.th")}
        ${opt("sms", ICON.sms, tx("ch_sms"), phone ? maskPhone(phone) : tx("sms_unknown"))}
        <div class="au-note warm">${ICON.info}<span>${esc(tx("demo_note"))}</span></div>
        ${errBox()}
        <button type="submit" class="au-btn">${esc(tx("send_code"))}</button>
        <p class="au-foot-q"><button type="button" class="au-link" data-go="login">${esc(tx("back_login"))}</button></p>
      </form>`;
  },
  otp() {
    const f = forgotState;
    const to = f.channel === "sms" ? maskPhone(f.phone || profile?.phone || (lsGet(LS_LAST, {}) || {}).phone) : maskEmail(f.email);
    return `${topBar(tx("reset_label"), "forgot", steps(2, 3, true))}
      <form class="au-form" id="auOtpForm" novalidate>
        <div class="au-demo-code" role="status">
          <span class="au-demo-ic">${f.channel === "sms" ? ICON.sms : ICON.mail}</span>
          <span class="au-demo-text"><span>${esc(tx(f.channel === "sms" ? "otp_banner_sms" : "otp_banner_email"))}</span><b>${f.code.slice(0, 3)} ${f.code.slice(3)}</b></span>
          <span class="au-demo-time">${esc(tx("now"))}</span>
        </div>
        <div class="au-head"><h1 class="au-h1">${esc(tx("otp_h"))}</h1><p class="au-sub">${esc(tx("otp_sent", { to }))}</p></div>
        <div class="au-otp" id="auOtpBoxes">${Array.from(
          { length: 6 },
          (_, i) => `<input type="text" inputmode="numeric" autocomplete="${i === 0 ? "one-time-code" : "off"}" class="au-otp-box" data-i="${i}" aria-label="Digit ${i + 1}">`
        ).join("")}</div>
        <div class="au-otp-meta"><span id="auOtpExp">${ICON.clock}<span></span></span><span id="auOtpResend"></span></div>
        <div class="au-note">${esc(tx("otp_rule"))}</div>
        ${errBox()}
        <button type="submit" class="au-btn">${esc(tx("verify"))}</button>
        <p class="au-foot-q"><button type="button" class="au-link" data-act="switch-ch">${esc(tx(f.channel === "sms" ? "switch_email" : "switch_sms"))}</button></p>
      </form>`;
  },
  reset() {
    if (mode === "firebase") {
      return `${topBar(tx("reset_label"), "login", steps(3, 3, true))}
        <div class="au-form">
          <span class="au-chip ok">${ICON.check}${esc(tx("verified"))}</span>
          <div class="au-head"><h1 class="au-h1">${esc(tx("fb_reset_h"))}</h1><p class="au-sub">${esc(tx("fb_reset_p", { to: forgotState.email }))}</p></div>
          <div class="au-note">${ICON.info}<span>${esc(tx("fb_reset_why"))}</span></div>
          <button type="button" class="au-btn" data-go="login">${esc(tx("back_login"))}</button>
        </div>`;
    }
    return `${topBar(tx("reset_label"), "otp", steps(3, 3, true))}
      <form class="au-form" id="auResetForm" novalidate>
        <span class="au-chip ok">${ICON.check}${esc(tx("verified"))}</span>
        <div class="au-head"><h1 class="au-h1">${esc(tx("newpw_h"))}</h1><p class="au-sub">${esc(tx("newpw_p"))}</p></div>
        <label class="au-field" for="auPw"><span>${esc(tx("newpw"))}</span><span class="au-pw"><input id="auPw" type="password" class="au-input" autocomplete="new-password"><button type="button" class="au-eye" data-eye="auPw" aria-label="Show password">${ICON.eye}</button></span></label>
        <div class="au-meter" id="auMeter"><div class="au-meter-bars"><span></span><span></span><span></span><span></span></div></div>
        ${field("auPw2", esc(tx("newpw2")), "password", 'autocomplete="new-password"')}
        <div class="au-rules" id="auRules"></div>
        ${errBox()}
        <button type="submit" class="au-btn">${esc(tx("save_signin"))}</button>
      </form>`;
  }
};

function brandPanel() {
  return `<section class="au-brand" aria-hidden="true">
    <svg class="au-brand-lines" viewBox="0 0 640 900" preserveAspectRatio="none"><g fill="none" stroke="#1F4636" stroke-width="2">
      <path d="M-20 620 C 120 560 220 660 360 600 S 560 540 680 600"/><path d="M-20 680 C 140 620 240 720 380 660 S 580 600 680 660"/>
      <path d="M-20 740 C 160 680 260 780 400 720 S 600 660 680 720"/><path d="M-20 800 C 180 740 280 840 420 780 S 620 720 680 780"/></g></svg>
    <div class="au-brand-top"><img src="./icons/blimbloom-emblem.png" alt=""><div><b>BlimBlom</b><span>${esc(tx("brand_tag"))}</span></div></div>
    <div class="au-brand-mid">
      <h2>${tx("brand_h")}</h2>
      <p>${esc(tx("brand_p"))}</p>
      <div class="au-brand-stats">
        <div><b>24/7</b><span>${esc(tx("brand_s1"))}</span></div>
        <div><b>&lt; 10 s</b><span>${esc(tx("brand_s2"))}</span></div>
        <div><b>PIN</b><span>${esc(tx("brand_s3"))}</span></div>
      </div>
    </div>
    <span class="au-brand-foot">${esc(tx("brand_foot"))}</span>
  </section>`;
}

function render() {
  if (!root || !view) return;
  // keep typed values across language re-render
  const keep = {};
  root.querySelectorAll("input[id], select[id]").forEach((el) => {
    keep[el.id] = el.type === "checkbox" ? el.checked : el.value;
  });
  const isDark = document.documentElement.classList.contains("dark");
  root.innerHTML = `${brandPanel()}
    <section class="au-main au-view-${view}">
      <div class="au-tools">
        <button type="button" class="au-icon-btn au-lang" data-act="lang">${L() === "en" ? "EN" : "TH"}</button>
        <button type="button" class="au-icon-btn" data-act="theme" aria-label="Theme">${isDark ? ICON.sun : ICON.moon}</button>
        ${dismissible && !locked && view !== "setpin" ? `<button type="button" class="au-icon-btn" data-act="close" aria-label="${esc(tx("close"))}">${ICON.close}</button>` : ""}
      </div>
      <div class="au-card">${VIEWS[view]()}</div>
      <span class="au-secure">${esc(tx(mode === "firebase" ? "secure_foot" : "demo_foot"))}</span>
    </section>`;
  for (const [id, v] of Object.entries(keep)) {
    const el = root.querySelector(`#${id}`);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = v;
    else if (v !== "") el.value = v;
  }
  bindView();
}

function showError(msg) {
  const box = root?.querySelector("#auErr");
  if (!box) return;
  box.textContent = msg;
  box.classList.toggle("hidden", !msg);
}

function open(next, opts = {}) {
  if (opts.dismissible !== undefined) dismissible = opts.dismissible;
  if (next !== "otp") stopOtpTimer();
  if (next === "setpin" || next === "pin") {
    pinBuf = "";
    pinMsg = "";
    if (next === "setpin") pinFirst = "";
  }
  view = next;
  root.classList.remove("hidden");
  document.documentElement.classList.add("au-open");
  render();
  if (next === "otp") startOtpTimer();
  const first = root.querySelector(".au-card input:not([disabled]), .au-card .au-key");
  if (first && first.tagName === "INPUT" && window.matchMedia("(min-width: 861px)").matches) first.focus();
}
export function openAuth(next = "login") {
  open(next, { dismissible: true });
}
function close() {
  view = null;
  locked = false;
  stopOtpTimer();
  root?.classList.add("hidden");
  document.documentElement.classList.remove("au-open");
}

// ---------------------------------------------------------------------------
// View behaviour
// ---------------------------------------------------------------------------
function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Za-z฀-๿]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (pw.length >= 12) s++;
  if (/[^A-Za-z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++;
  return pw ? Math.max(1, s) : 0;
}
function bindMeter() {
  const pw = root.querySelector("#auPw");
  const meter = root.querySelector("#auMeter");
  if (!pw || !meter) return;
  const upd = () => {
    const s = strength(pw.value);
    meter.dataset.level = String(s);
    const txt = meter.querySelector(".au-meter-text");
    if (txt) txt.textContent = s === 0 ? tx("pw_hint") : `${tx(["pw_weak", "pw_weak", "pw_ok", "pw_good", "pw_strong"][s])} · ${tx("pw_hint")}`;
    const rules = root.querySelector("#auRules");
    const pw2 = root.querySelector("#auPw2");
    if (rules) {
      const r = (ok, k) => `<span class="${ok ? "ok" : ""}">${ok ? ICON.check : ICON.dot}${esc(tx(k))}</span>`;
      rules.innerHTML =
        r(pw.value.length >= 8, "r_len") +
        r(/[A-Za-z฀-๿]/.test(pw.value) && /[0-9]/.test(pw.value), "r_mix") +
        r(pw.value && pw2 && pw.value === pw2.value, "r_match");
    }
  };
  pw.addEventListener("input", upd);
  root.querySelector("#auPw2")?.addEventListener("input", upd);
  upd();
}

async function busy(btn, fn) {
  if (btn) btn.disabled = true;
  showError("");
  try {
    await fn();
  } catch (err) {
    console.warn("[Auth]", err);
    showError(fbError(err));
  } finally {
    if (btn && btn.isConnected) btn.disabled = false;
  }
}

function bindView() {
  root.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      const to = b.dataset.go;
      if (to === "forgot") {
        const em = root.querySelector("#auEmail")?.value?.trim();
        if (em) forgotState.email = em;
      }
      open(to);
    })
  );
  root.querySelectorAll("[data-eye]").forEach((b) =>
    b.addEventListener("click", () => {
      const inp = root.querySelector(`#${b.dataset.eye}`);
      if (inp) inp.type = inp.type === "password" ? "text" : "password";
    })
  );
  root.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => onAct(b.dataset.act)));

  if (view === "login") {
    root.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        loginTab = b.dataset.tab;
        render();
      })
    );
    root.querySelector("#auLoginForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = root.querySelector("#auEmail")?.value.trim() || "";
      const pw = root.querySelector("#auPw")?.value || "";
      if (!emailOk(email)) return showError(tx("err_email"));
      if (!pw) return showError(tx("err_pw"));
      busy(e.submitter || root.querySelector(".au-btn"), () => doLogin(email, pw, root.querySelector("#auKeep")?.checked !== false));
    });
  }

  if (view === "register") {
    bindMeter();
    const st = root.querySelector("#auStation");
    if (st && !st.value) st.selectedIndex = 0;
    root.querySelector("#auRegForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = (id) => root.querySelector(`#${id}`)?.value.trim() || "";
      const f = { name: v("auName"), phone: v("auPhone"), station: v("auStation"), email: v("auEmail"), agency: v("auAgency"), password: root.querySelector("#auPw").value };
      if (!f.name) return showError(tx("err_name"));
      if (!phoneOk(f.phone)) return showError(tx("err_phone"));
      if (!emailOk(f.email)) return showError(tx("err_email"));
      if (!pwOk(f.password)) return showError(tx("err_pw_rule"));
      if (!root.querySelector("#auConsent").checked) return showError(tx("err_consent"));
      busy(root.querySelector("#auRegForm .au-btn"), () => doRegister(f));
    });
  }

  if (view === "setpin" || view === "pin") {
    root.querySelectorAll("[data-key]").forEach((b) => b.addEventListener("click", () => pinKeyPress(b.dataset.key)));
  }

  if (view === "forgot") {
    root.querySelectorAll("[data-ch]").forEach((b) =>
      b.addEventListener("click", () => {
        forgotState.email = root.querySelector("#auEmail")?.value.trim() || forgotState.email;
        forgotState.channel = b.dataset.ch;
        render();
      })
    );
    root.querySelector("#auEmail")?.addEventListener("change", (e) => {
      forgotState.email = e.target.value.trim();
    });
    root.querySelector("#auForgotForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = root.querySelector("#auEmail").value.trim();
      if (!emailOk(email)) return showError(tx("err_email"));
      busy(root.querySelector("#auForgotForm .au-btn"), async () => {
        if (mode === "local") {
          const acc = localAccounts()[email.toLowerCase()];
          if (!acc) throw new Error(tx("err_no_account"));
          forgotState.phone = acc.profile?.phone || "";
        }
        forgotState.email = email;
        forgotState.resends = 0;
        issueOtp();
        open("otp");
      });
    });
  }

  if (view === "otp") {
    const boxes = [...root.querySelectorAll(".au-otp-box")];
    boxes.forEach((bx, i) => {
      bx.addEventListener("input", () => {
        const digits = bx.value.replace(/\D/g, "");
        if (digits.length > 1) {
          digits.split("").slice(0, 6 - i).forEach((d, j) => (boxes[i + j].value = d));
          boxes[Math.min(5, i + digits.length)]?.focus();
        } else {
          bx.value = digits;
          if (digits && boxes[i + 1]) boxes[i + 1].focus();
        }
        if (boxes.every((b) => b.value)) root.querySelector("#auOtpForm").requestSubmit();
      });
      bx.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !bx.value && boxes[i - 1]) boxes[i - 1].focus();
      });
    });
    root.querySelector("#auOtpResend")?.addEventListener("click", (e) => {
      if (e.target.closest("button")) {
        if (forgotState.resends >= OTP_MAX_RESENDS) return showError(tx("resend_max"));
        forgotState.resends++;
        issueOtp();
        open("otp");
      }
    });
    root.querySelector("#auOtpForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = boxes.map((b) => b.value).join("");
      const f = forgotState;
      if (Date.now() - f.issued > OTP_TTL_MS || f.tries >= OTP_MAX_TRIES) return showError(tx("otp_dead"));
      if (code !== f.code) {
        f.tries++;
        boxes.forEach((b) => (b.value = ""));
        boxes[0].focus();
        return showError(f.tries >= OTP_MAX_TRIES ? tx("otp_dead") : tx("otp_wrong", { n: OTP_MAX_TRIES - f.tries }));
      }
      f.code = "";
      if (mode === "firebase") {
        busy(root.querySelector("#auOtpForm .au-btn"), async () => {
          await sendPasswordResetEmail(auth, f.email);
          open("reset");
        });
      } else {
        open("reset");
      }
    });
  }

  if (view === "reset" && mode === "local") {
    bindMeter();
    root.querySelector("#auResetForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const pw = root.querySelector("#auPw").value;
      const pw2 = root.querySelector("#auPw2").value;
      if (!pwOk(pw)) return showError(tx("err_pw_rule"));
      if (pw !== pw2) return showError(tx("err_pw_match"));
      busy(root.querySelector("#auResetForm .au-btn"), async () => {
        const accs = localAccounts();
        const acc = accs[forgotState.email.toLowerCase()];
        if (!acc) throw new Error(tx("err_no_account"));
        const salt = newSalt();
        acc.pw = { salt, hash: await pbkdf2(pw, salt) };
        lsSet(LS_ACCOUNTS, accs);
        clearPin(acc.uid);
        setLocalSession(acc.uid, true);
        await applyUser({ uid: acc.uid, email: acc.email, name: acc.profile?.name || "" }, true);
      });
    });
  }
}

function issueOtp() {
  forgotState.code = randomDigits(6);
  forgotState.issued = Date.now();
  forgotState.tries = 0;
}
function startOtpTimer() {
  stopOtpTimer();
  const tick = () => {
    const exp = root.querySelector("#auOtpExp span");
    const rs = root.querySelector("#auOtpResend");
    if (!exp || !rs) return stopOtpTimer();
    const left = OTP_TTL_MS - (Date.now() - forgotState.issued);
    exp.textContent = left > 0 ? tx("expires", { t: mmss(left) }) : tx("expired");
    exp.parentElement.classList.toggle("warm", left <= 0);
    const rleft = OTP_RESEND_MS - (Date.now() - forgotState.issued);
    rs.innerHTML =
      rleft > 0
        ? `<span class="muted">${esc(tx("resend_in", { t: mmss(rleft).replace(/^0/, "") }))}</span>`
        : `<button type="button" class="au-link">${esc(tx("resend"))}</button>`;
  };
  tick();
  otpTimer = setInterval(tick, 1000);
}
function stopOtpTimer() {
  if (otpTimer) clearInterval(otpTimer);
  otpTimer = null;
}

async function pinKeyPress(k) {
  if (k === "del") {
    pinBuf = pinBuf.slice(0, -1);
    pinMsg = "";
    return render();
  }
  if (pinBuf.length >= 6) return;
  pinBuf += k;
  pinMsg = "";
  render();
  if (pinBuf.length < 6) return;

  if (view === "setpin") {
    if (!pinFirst) {
      pinFirst = pinBuf;
      pinBuf = "";
      return setTimeout(render, 120);
    }
    if (pinBuf !== pinFirst) {
      pinFirst = "";
      pinBuf = "";
      pinMsg = tx("setpin_mismatch");
      return setTimeout(render, 120);
    }
    await savePin(pinBuf);
    pinFirst = "";
    pinBuf = "";
    hooks.toast(tx("pin_saved"));
    close();
    return;
  }

  // unlock
  const rec = getPinRec();
  if (!rec) return open("login", { dismissible: false });
  const ok = (await pbkdf2(pinBuf, rec.salt)) === rec.hash;
  if (ok) {
    rec.fails = 0;
    lsSet(pinKey(user.uid), rec);
    pinBuf = "";
    unlockedUid = user.uid;
    close();
    return;
  }
  rec.fails = (rec.fails || 0) + 1;
  pinBuf = "";
  if (rec.fails >= PIN_MAX_FAILS) {
    const uid = user.uid;
    clearPin(uid);
    locked = false;
    if (mode === "firebase") await signOut(auth);
    else {
      setLocalSession(null);
      await applyUser(null, false);
    }
    open("login", { dismissible: true });
    showError(tx("pin_locked"));
    return;
  }
  lsSet(pinKey(user.uid), rec);
  pinMsg = tx("pin_wrong", { n: PIN_MAX_FAILS - rec.fails });
  setTimeout(render, 80);
}

function onAct(act) {
  if (act === "close" || act === "guest") {
    ssSet(SS_GUEST, "1");
    close();
  } else if (act === "lang") {
    document.getElementById("btnLangToggle")?.click();
  } else if (act === "theme") {
    document.getElementById("btnThemeToggle")?.click();
    render();
  } else if (act === "skip-pin") {
    ssSet(SS_PIN_SKIP, "1");
    close();
  } else if (act === "use-password") {
    const email = user?.email || "";
    locked = false;
    const finish = () => {
      open("login", { dismissible: true });
      const em = root.querySelector("#auEmail");
      if (em) em.value = email;
    };
    if (mode === "firebase") signOut(auth).then(finish);
    else {
      setLocalSession(null);
      applyUser(null, false).then(finish);
    }
  } else if (act === "logout") {
    logout().then(() => open("login", { dismissible: true }));
  } else if (act === "switch-ch") {
    forgotState.channel = forgotState.channel === "sms" ? "email" : "sms";
    if (forgotState.resends < OTP_MAX_RESENDS) {
      forgotState.resends++;
      issueOtp();
    }
    open("otp");
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
export function initAuth(firebaseApp, opts = {}) {
  hooks = { ...hooks, ...opts };
  root = document.createElement("div");
  root.id = "authScreen";
  root.className = "hidden";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Account");
  document.body.appendChild(root);

  // physical keyboard for the PIN pad
  document.addEventListener("keydown", (e) => {
    if (view !== "pin" && view !== "setpin") return;
    if (/^[0-9]$/.test(e.key)) pinKeyPress(e.key);
    else if (e.key === "Backspace") pinKeyPress("del");
  });
  // re-render on language change (i18n sets <html lang>)
  new MutationObserver(() => view && render()).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  // lock again when the user comes back after switching away
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt >= LOCK_AFTER_HIDDEN_MS && user && hasPin() && view !== "pin") lock();
  });

  if (firebaseApp) {
    mode = "firebase";
    auth = getAuth(firebaseApp);
    fdb = getFirestore(firebaseApp);
    // Show the right first screen straight away (no dashboard flash):
    // PIN if this device remembers a signed-in user with a PIN, otherwise login.
    const last = lsGet(LS_LAST, null);
    if (last && last.uid && lsGet(pinKey(last.uid))) {
      user = { uid: last.uid, email: "", name: last.name || "" };
      lock();
    } else if (!last && !ssGet(SS_GUEST)) {
      open("login", { dismissible: true });
    }
    onAuthStateChanged(auth, async (fu) => {
      const fresh = justSignedIn && !firstAuthEvent;
      firstAuthEvent = false;
      justSignedIn = false;
      await applyUser(fu ? { uid: fu.uid, email: fu.email || "", name: fu.displayName || "" } : null, fresh);
    });
  } else {
    mode = "local";
    const uid = localSessionUid();
    const acc = uid ? localUserByUid(uid) : null;
    applyUser(acc ? { uid: acc.uid, email: acc.email, name: acc.profile?.name || "" } : null, false);
  }
}
