import type { FastifyRequest, FastifyReply } from "fastify";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

/**
 * Verifica el JWT del usuario contra Supabase Auth (delegado — no se
 * decodifica/valida la firma localmente, así funciona sin importar si el
 * proyecto firma con HS256 o con claves asimétricas). Sobre esto corre
 * después del rate limit (ver rateLimitKey.ts) — este es el único punto
 * donde el token realmente se valida y puede rechazar la solicitud.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Falta el token de autenticación." });
  }

  const token = authHeader.slice("Bearer ".length);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return reply.code(401).send({ error: "Token inválido o expirado." });
  }

  request.userId = data.user.id;
}
