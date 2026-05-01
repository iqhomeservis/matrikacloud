/**
 * Generates SHA-256 hash of a string using Web Crypto API
 */
export async function generateHash(input) {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Formats a date as DD.MM.YYYY (Slovak format)
 */
export function formatDateSK(isoOrDate) {
  if (!isoOrDate) return "";
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleDateString("sk-SK");
}

/**
 * Formats a sequential number as poradoveCislo
 */
export function formatPoradoveCislo(template, rok, seq) {
  return template
    .replace("{ROK}", rok)
    .replace("{NNNNN}", seq.toString().padStart(5, "0"));
}

/**
 * Masks sensitive string — shows only last 4 chars
 */
export function maskSensitive(value) {
  if (!value) return "—";
  if (value.length <= 4) return "••••";
  return "••••••" + value.slice(-4);
}

/**
 * Encrypts a field value using AES-256-GCM (Web Crypto API)
 * Returns base64-encoded ciphertext with prepended IV
 * NOTE: In production, key should be derived from user password via PBKDF2
 */
export async function encryptField(plaintext, keyMaterial) {
  if (!plaintext) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Validates Slovak birth number (rodné číslo)
 */
export function validateRodneCislo(rc) {
  if (!rc) return false;
  const cleaned = rc.replace(/\D/g, "");
  if (cleaned.length !== 9 && cleaned.length !== 10) return false;
  if (cleaned.length === 10) {
    const num = parseInt(cleaned, 10);
    return num % 11 === 0;
  }
  return true;
}