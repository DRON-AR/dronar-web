import type { SupabaseClient } from "@supabase/supabase-js";

export interface Recipient {
  userId: string;
  email: string | null;
}

export interface AlertLike {
  type: string;
  related_table: string;
  related_id: string;
}

function dedupeRecipients(recipients: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  return recipients.filter((r) => {
    if (seen.has(r.userId)) return false;
    seen.add(r.userId);
    return true;
  });
}

async function getAdminAndJefeRecipients(supabase: SupabaseClient): Promise<Recipient[]> {
  // Se resuelve en dos pasos (roles -> users) en vez de un filtro anidado
  // sobre la relación embebida, para no depender de sintaxis !inner de
  // PostgREST que varía entre versiones.
  const { data: roles } = await supabase.from("roles").select("id").in("name", ["ADMIN", "JEFE_PILOTOS"]);
  const roleIds = (roles ?? []).map((r) => r.id);
  if (roleIds.length === 0) return [];

  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .in("role_id", roleIds)
    .eq("active", true);

  return (users ?? []).map((u) => ({ userId: u.id, email: u.email }));
}

async function getUserRecipient(supabase: SupabaseClient, userId: string): Promise<Recipient[]> {
  const { data } = await supabase.from("users").select("id, email").eq("id", userId).maybeSingle();
  if (!data) return [];
  return [{ userId: data.id, email: data.email }];
}

/**
 * Política de destinatarios por tipo de alerta:
 * - MEDICAL_EXPIRING    -> el propio titular + ADMIN/JEFE_PILOTOS
 * - PRE_FLIGHT_PENDING  -> el piloto de la misión
 * - MAINTENANCE_OVERDUE -> solo ADMIN/JEFE_PILOTOS (operativo, sin dueño individual)
 * - GO_NO_GO_BLOCKED    -> solo ADMIN/JEFE_PILOTOS (seguridad crítica)
 * - cualquier otro tipo -> ADMIN/JEFE_PILOTOS por defecto (nunca "nadie")
 */
export async function resolveRecipients(supabase: SupabaseClient, alert: AlertLike): Promise<Recipient[]> {
  switch (alert.type) {
    case "MEDICAL_EXPIRING": {
      const { data: record } = await supabase
        .from("medical_records")
        .select("user_id")
        .eq("id", alert.related_id)
        .maybeSingle();
      const admins = await getAdminAndJefeRecipients(supabase);
      const owner = record?.user_id ? await getUserRecipient(supabase, record.user_id) : [];
      return dedupeRecipients([...owner, ...admins]);
    }
    case "PRE_FLIGHT_PENDING": {
      const { data: mission } = await supabase
        .from("missions")
        .select("pilot_id")
        .eq("id", alert.related_id)
        .maybeSingle();
      return mission?.pilot_id ? getUserRecipient(supabase, mission.pilot_id) : [];
    }
    case "MAINTENANCE_OVERDUE":
    case "GO_NO_GO_BLOCKED":
    default:
      return getAdminAndJefeRecipients(supabase);
  }
}
