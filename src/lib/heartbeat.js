import { base44 } from "@/api/base44Client";

const APP_VERSION = "1.0.0";

export async function getLicencia() {
  const list = await base44.entities.Licencia.list("-created_date", 1);
  return list[0] || null;
}

export async function checkOfflineStatus() {
  const lic = await getLicencia();
  if (!lic || lic.status === "NOT_ACTIVATED") return;
  const last = lic.posledneOverenie ? new Date(lic.posledneOverenie) : null;
  if (!last) return;
  const hoursSince = (Date.now() - last.getTime()) / 3600000;
  if (hoursSince >= 24) {
    const newDays = (lic.offlineDniPocet || 0) + Math.floor(hoursSince / 24);
    let newStatus = lic.status;
    if (newDays >= 30) newStatus = "RESTRICTED";
    await base44.entities.Licencia.update(lic.id, {
      offlineDniPocet: newDays,
      status: newStatus,
    });
    window.dispatchEvent(new CustomEvent("licencia-updated"));
  }
}

export async function performHeartbeat() {
  const lic = await getLicencia();
  if (!lic || lic.status === "NOT_ACTIVATED") return;

  const now = new Date().toISOString();
  let pocetZaznamov = 0;
  try {
    const zazn = await base44.entities.OverovaciaKniha.list("-created_date", 9999);
    pocetZaznamov = zazn.length;
  } catch {}

  await base44.entities.HeartbeatLog.create({
    cas: now,
    typ: "HEARTBEAT",
    vysledok: "SUCCESS",
    pocetZaznamovVKnihe: pocetZaznamov,
    verziaApp: APP_VERSION,
  });

  // State transitions
  let newStatus = lic.status;
  const platnostDo = lic.platnostDo ? new Date(lic.platnostDo) : null;
  if (platnostDo && platnostDo < new Date()) {
    newStatus = "RESTRICTED";
  } else if (lic.status === "RESTRICTED" || (lic.offlineDniPocet || 0) >= 30) {
    newStatus = "ACTIVE";
  }

  await base44.entities.Licencia.update(lic.id, {
    posledneOverenie: now,
    offlineDniPocet: 0,
    status: newStatus,
  });

  window.dispatchEvent(new CustomEvent("licencia-updated"));
  return true;
}

export async function shouldRunHeartbeat() {
  const lic = await getLicencia();
  if (!lic || lic.status === "NOT_ACTIVATED") return false;
  if (!lic.posledneOverenie) return true;
  const hoursSince = (Date.now() - new Date(lic.posledneOverenie).getTime()) / 3600000;
  return hoursSince >= 6;
}