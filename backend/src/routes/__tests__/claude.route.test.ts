import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { registerSecurity } from "../../plugins/security.js";
import { healthRoutes } from "../health.js";
import { claudeRoutes } from "../claude.js";

let app: FastifyInstance;

before(async () => {
  process.env.FRONTEND_ORIGIN = "http://localhost:3000";
  app = Fastify();
  await registerSecurity(app);
  await app.register(healthRoutes);
  await app.register(claudeRoutes);
  await app.ready();
});

after(async () => {
  await app.close();
});

test("POST /api/claude sin Authorization devuelve 401 sin tocar Supabase/Claude", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/claude",
    payload: { prompt_version: "v1.0", input: {} },
  });

  assert.equal(response.statusCode, 401);
  assert.match(response.body, /token de autenticación/);
});

test("POST /api/claude con Authorization mal formado (sin 'Bearer ') devuelve 401", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/claude",
    headers: { authorization: "Token abc123" },
    payload: { prompt_version: "v1.0", input: {} },
  });

  assert.equal(response.statusCode, 401);
});

test("GET /health sigue funcionando con la ruta de Claude registrada", async () => {
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.status, "ok");
});
