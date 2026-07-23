#!/usr/bin/env node
/**
 * Prueba de carga mínima del Bloque 10 — valida que el rate limiting
 * responda como está configurado, no solo que "el servidor aguanta".
 *
 * Uso:
 *   BASE_URL=http://localhost:4000 node loadtest/run.mjs
 *   BASE_URL=https://dronar-backend-staging.onrender.com node loadtest/run.mjs
 *
 * Requiere autocannon: npm install --no-save autocannon (no es una
 * dependencia permanente del backend — solo se usa para este script).
 */
import autocannon from "autocannon";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4000";

function run(opts) {
  return new Promise((resolve, reject) => {
    autocannon(opts, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

function summarize(label, result) {
  const codes = result.statusCodeStats ?? {};
  console.log(`\n=== ${label} ===`);
  console.log(`  peticiones: ${result.requests.total} en ${(result.duration).toFixed(1)}s`);
  console.log(`  latencia p50/p99: ${result.latency.p50}ms / ${result.latency.p99}ms`);
  console.log(`  códigos: ${Object.entries(codes).map(([k, v]) => `${k}=${v.count}`).join(", ")}`);
}

async function main() {
  console.log(`Backend objetivo: ${BASE_URL}`);
  console.log("ADVERTENCIA: usar solo contra staging/local — nunca contra producción con tráfico real.");

  const health = await run({
    url: `${BASE_URL}/health`,
    connections: 20,
    duration: 5,
  });
  summarize("/health bajo carga (20 conexiones, 5s)", health);

  const claude = await run({
    url: `${BASE_URL}/api/claude`,
    connections: 10,
    duration: 4,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt_version: "v1.0", input: {} }),
  });
  summarize("/api/claude sin auth (valida rate limit por ruta + guard de autenticación)", claude);

  const health2xx = health.statusCodeStats?.["200"]?.count ?? 0;
  const claude401 = claude.statusCodeStats?.["401"]?.count ?? 0;
  const claude429 = claude.statusCodeStats?.["429"]?.count ?? 0;

  console.log("\n=== Veredicto ===");
  console.log(
    health2xx > 0 && health2xx < health.requests.total
      ? "OK: /health mezcla 200 y 429 — el rate limit global está activo."
      : "REVISAR: /health no muestra el patrón esperado de 200+429 — confirmar RATE_LIMIT_MAX/WINDOW."
  );
  console.log(
    claude401 > 0 && claude429 > 0
      ? "OK: /api/claude mezcla 401 (guard de auth) y 429 (rate limit) — ambas capas activas."
      : "REVISAR: /api/claude no muestra el patrón esperado de 401+429."
  );
}

main().catch((err) => {
  console.error("Error en la prueba de carga:", err);
  process.exit(1);
});
