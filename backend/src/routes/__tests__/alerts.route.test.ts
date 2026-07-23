import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { registerSecurity } from "../../plugins/security.js";
import { alertRoutes } from "../alerts.js";

let app: FastifyInstance;
const ORIGINAL_ENV = { ...process.env };

before(async () => {
  process.env.FRONTEND_ORIGIN = "http://localhost:3000";
  app = Fastify();
  await registerSecurity(app);
  await app.register(alertRoutes);
  await app.ready();
});

after(async () => {
  await app.close();
});

beforeEach(() => {
  process.env.ALERTS_SCAN_SECRET = "test-scan-secret";
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("POST /api/alerts/scan sin secreto devuelve 401", async () => {
  const response = await app.inject({ method: "POST", url: "/api/alerts/scan" });
  assert.equal(response.statusCode, 401);
});

test("POST /api/alerts/scan con secreto incorrecto devuelve 401", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/alerts/scan",
    headers: { "x-scan-secret": "incorrecto" },
  });
  assert.equal(response.statusCode, 401);
});

test("POST /api/alerts/scan sin ALERTS_SCAN_SECRET configurada devuelve 500 (falla cerrado, no abierto)", async () => {
  delete process.env.ALERTS_SCAN_SECRET;
  const response = await app.inject({
    method: "POST",
    url: "/api/alerts/scan",
    headers: { "x-scan-secret": "cualquier-cosa" },
  });
  assert.equal(response.statusCode, 500);
});

test("POST /api/push/subscribe sin Authorization devuelve 401", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/push/subscribe",
    payload: { endpoint: "https://push.example.com/x", keys: { p256dh: "a", auth: "b" } },
  });
  assert.equal(response.statusCode, 401);
});
