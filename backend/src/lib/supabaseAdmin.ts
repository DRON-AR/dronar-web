import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Cliente con service_role: bypassa RLS por diseño (ver supabase/migrations
 * 0011 — logs/audit_prompts/alerts no tienen policy de escritura para
 * `authenticated` justamente porque solo este cliente, desde el backend,
 * debe poder escribir ahí). NUNCA exponer SUPABASE_SERVICE_ROLE al frontend.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE no configuradas.");
  }

  cachedClient = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

/** Solo para pruebas: permite inyectar un cliente falso. */
export function __setSupabaseAdminForTests(client: SupabaseClient | null) {
  cachedClient = client;
}
