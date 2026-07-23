import type { SupabaseClient } from "@supabase/supabase-js";

export interface ScanResult {
  created: number;
}

async function alertAlreadyOpen(
  supabase: SupabaseClient,
  type: string,
  relatedTable: string,
  relatedId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("alerts")
    .select("id")
    .eq("type", type)
    .eq("related_table", relatedTable)
    .eq("related_id", relatedId)
    .eq("status", "ABIERTA")
    .maybeSingle();
  return !!data;
}

/** Certificados médicos VIGENTE que vencen dentro de N días — no bloquea, solo avisa. */
export async function scanMedicalExpiring(
  supabase: SupabaseClient,
  daysAhead = Number(process.env.MEDICAL_EXPIRING_DAYS_THRESHOLD ?? 30)
): Promise<ScanResult> {
  const today = new Date();
  const limit = new Date(today);
  limit.setUTCDate(limit.getUTCDate() + daysAhead);

  const { data: records, error } = await supabase
    .from("medical_records")
    .select("id, user_id, expiry_date")
    .eq("estado_medico", "VIGENTE")
    .not("expiry_date", "is", null)
    .lte("expiry_date", limit.toISOString().slice(0, 10))
    .gte("expiry_date", today.toISOString().slice(0, 10));

  if (error || !records) return { created: 0 };

  let created = 0;
  for (const record of records) {
    if (await alertAlreadyOpen(supabase, "MEDICAL_EXPIRING", "medical_records", record.id)) continue;
    const { error: insertError } = await supabase.from("alerts").insert({
      type: "MEDICAL_EXPIRING",
      severity: "MEDIA",
      status: "ABIERTA",
      related_table: "medical_records",
      related_id: record.id,
      message: `El certificado médico vence el ${record.expiry_date}.`,
      triggered_by: "scan:medical_expiring",
    });
    if (!insertError) created++;
  }
  return { created };
}

/** Mantenimiento programado que ya pasó su fecha y sigue sin completarse. */
export async function scanMaintenanceOverdue(supabase: SupabaseClient): Promise<ScanResult> {
  const nowIso = new Date().toISOString();

  const { data: items, error } = await supabase
    .from("maintenance")
    .select("id, aircraft_registration, scheduled_at")
    .not("scheduled_at", "is", null)
    .lt("scheduled_at", nowIso)
    .neq("status", "COMPLETADO");

  if (error || !items) return { created: 0 };

  let created = 0;
  for (const item of items) {
    if (await alertAlreadyOpen(supabase, "MAINTENANCE_OVERDUE", "maintenance", item.id)) continue;
    const { error: insertError } = await supabase.from("alerts").insert({
      type: "MAINTENANCE_OVERDUE",
      severity: "ALTA",
      status: "ABIERTA",
      related_table: "maintenance",
      related_id: item.id,
      message: `Mantenimiento vencido para ${item.aircraft_registration} (programado: ${item.scheduled_at}).`,
      triggered_by: "scan:maintenance_overdue",
    });
    if (!insertError) created++;
  }
  return { created };
}

/** Misiones próximas a iniciar sin firma pre-vuelo (RAC 120 la bloqueará si el médico está vencido). */
export async function scanPreFlightPending(
  supabase: SupabaseClient,
  hoursAhead = Number(process.env.PRE_FLIGHT_PENDING_HOURS_THRESHOLD ?? 24)
): Promise<ScanResult> {
  const now = new Date();
  const limit = new Date(now);
  limit.setUTCHours(limit.getUTCHours() + hoursAhead);

  const { data: missions, error } = await supabase
    .from("missions")
    .select("id, pilot_id, scheduled_start")
    .eq("pre_flight_signed", false)
    .not("scheduled_start", "is", null)
    .lte("scheduled_start", limit.toISOString())
    .gte("scheduled_start", now.toISOString())
    .not("status", "in", "(CANCELADA,COMPLETADA)");

  if (error || !missions) return { created: 0 };

  let created = 0;
  for (const mission of missions) {
    if (await alertAlreadyOpen(supabase, "PRE_FLIGHT_PENDING", "missions", mission.id)) continue;
    const { error: insertError } = await supabase.from("alerts").insert({
      type: "PRE_FLIGHT_PENDING",
      severity: "MEDIA",
      status: "ABIERTA",
      related_table: "missions",
      related_id: mission.id,
      message: `Firma pre-vuelo pendiente para la misión programada el ${mission.scheduled_start}.`,
      triggered_by: "scan:pre_flight_pending",
    });
    if (!insertError) created++;
  }
  return { created };
}

export interface AllScansResult {
  medicalExpiring: number;
  maintenanceOverdue: number;
  preFlightPending: number;
}

export async function runAllScans(supabase: SupabaseClient): Promise<AllScansResult> {
  const [medical, maintenance, preFlight] = await Promise.all([
    scanMedicalExpiring(supabase),
    scanMaintenanceOverdue(supabase),
    scanPreFlightPending(supabase),
  ]);
  return {
    medicalExpiring: medical.created,
    maintenanceOverdue: maintenance.created,
    preFlightPending: preFlight.created,
  };
}
