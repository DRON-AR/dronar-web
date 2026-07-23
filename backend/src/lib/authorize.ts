import type { SupabaseClient } from "@supabase/supabase-js";

const ADMIN_OR_JEFE_ROLES = new Set(["ADMIN", "JEFE_PILOTOS"]);
const CONTENT_STAFF_ROLES = new Set(["ADMIN", "JEFE_PILOTOS", "INSTRUCTOR"]);

/**
 * El backend usa service_role, que bypassa RLS por completo — por eso esta
 * verificación de rol a nivel de aplicación es la única barrera real para
 * rutas restringidas (emitir certificados, generar/revisar contenido de
 * evaluación). No delegar esto a RLS (que aquí no aplica) dejaría esas
 * rutas efectivamente abiertas a cualquier usuario autenticado.
 */
async function getUserRoleName(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("roles ( name )")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  const roleName = (data as { roles?: { name?: string } }).roles?.name;
  return typeof roleName === "string" ? roleName : null;
}

export async function isAdminOrJefe(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const role = await getUserRoleName(supabase, userId);
  return role !== null && ADMIN_OR_JEFE_ROLES.has(role);
}

/** ADMIN, JEFE_PILOTOS o INSTRUCTOR — el trío autorizado a generar/revisar contenido educativo. */
export async function isAdminOrJefeOrInstructor(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const role = await getUserRoleName(supabase, userId);
  return role !== null && CONTENT_STAFF_ROLES.has(role);
}
