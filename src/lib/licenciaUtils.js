/**
 * Mock license activation logic.
 * In production, this will call a real licensing server.
 */

const EDITION_MAP = {
  "MTRK6-TEST1-BASIC": { edicia: "BASIC", maxStanic: 1, funkcie: ["OVEROVANIE_LISTIN", "OVEROVANIE_PODPISOV", "AUDIT_LOG"] },
  "MTRK6-TEST1-STAND": { edicia: "STANDARD", maxStanic: 3, funkcie: ["OVEROVANIE_LISTIN", "OVEROVANIE_PODPISOV", "TLAC_STITKOV", "AUDIT_LOG", "ZALOHY_LOKALNE", "REPORTY_MESACNE"] },
  "MTRK6-TEST1-PREMM": { edicia: "PREMIUM", maxStanic: 999, funkcie: ["OVEROVANIE_LISTIN", "OVEROVANIE_PODPISOV", "TLAC_STITKOV", "AUDIT_LOG", "ZALOHY_LOKALNE", "ZALOHY_CLOUD", "REPORTY_MESACNE"] },
};

export async function activateLicenseMock(licencnyKluc) {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 1800));

  const prefix = licencnyKluc.slice(0, 16); // "MTRK6-TEST1-XXXX"
  const shortPrefix = licencnyKluc.slice(0, 15); // "MTRK6-TEST1-XXX"

  // Check test keys
  for (const [pattern, data] of Object.entries(EDITION_MAP)) {
    if (licencnyKluc.startsWith(pattern)) {
      return {
        success: true,
        data: {
          licenseId: `MTRK-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          ...data,
        },
      };
    }
  }

  // All other keys → error
  return { success: false, errorCode: "INVALID_KEY" };
}

export function generateHardwareFingerprint() {
  // Mock fingerprint — in Tauri this will use real hardware IDs
  return "HW-" + crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 24);
}

export const LICENSE_ERROR_MESSAGES = {
  INVALID_KEY: "Aktivačný kľúč nie je platný. Skontrolujte zadanie.",
  KEY_ALREADY_USED: "Tento kľúč je už aktivovaný na inom počítači. Pre prenos kontaktujte podporu.",
  ICO_MISMATCH: "IČO nezodpovedá vydanej licencii. Overte si údaje.",
  NETWORK_ERROR: "Nedá sa pripojiť na licenčný server. Skontrolujte internetové pripojenie.",
};

export function validateLicenseKey(key) {
  return /^MTRK6-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(key);
}

export function validateICO(ico) {
  if (!/^\d{8}$/.test(ico)) return false;
  // Slovak IČO mod 11 checksum
  const digits = ico.split("").map(Number);
  const weights = [8, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  const remainder = sum % 11;
  let check;
  if (remainder === 0) check = 0;
  else if (remainder === 1) check = 0; // special case
  else check = 11 - remainder;
  return check === digits[7];
}

export function formatLicenseKeyInput(raw) {
  // Keep only alphanumeric, uppercase
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Insert dashes at positions 5,10,15,20
  const parts = [];
  if (clean.length > 0) parts.push(clean.slice(0, 5));
  if (clean.length > 5) parts.push(clean.slice(5, 10));
  if (clean.length > 10) parts.push(clean.slice(10, 15));
  if (clean.length > 15) parts.push(clean.slice(15, 20));
  if (clean.length > 20) parts.push(clean.slice(20, 25));
  // Always prepend MTRK6 prefix
  const joined = parts.join("-");
  return joined;
}