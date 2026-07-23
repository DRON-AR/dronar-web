import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";

/**
 * Hardening base del backend, según reglas inviolables del proyecto:
 * - CORS restringido a FRONTEND_ORIGIN (única variable de entorno, no wildcard).
 * - Rate limiting global por defecto; rutas sensibles (p. ej. /api/claude)
 *   pueden sobreescribir el límite en su propio config de ruta.
 * - Cabeceras de seguridad estándar vía helmet.
 */
export async function registerSecurity(app: FastifyInstance) {
  const origin = process.env.FRONTEND_ORIGIN;
  if (!origin) {
    throw new Error(
      "FRONTEND_ORIGIN no está definida — requerida para configurar CORS de forma segura."
    );
  }

  // --- CORS: snippet obligatorio ---
  await app.register(cors, {
    origin,
    credentials: true,
  });

  // --- Rate limit: snippet obligatorio (config global; rutas pueden ajustar) ---
  await app.register(rateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 60),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? "1 minute",
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // se define explícitamente al introducir el frontend servido
  });
}
