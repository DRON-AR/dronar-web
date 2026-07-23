import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { registerSecurity } from "../../plugins/security.js";
import { certificateRoutes } from "../certificates.js";

let app: FastifyInstance;

before(async () => {
  process.env.FRONTEND_ORIGIN = "http://localhost:3000";
  app = Fastify();
  await registerSecurity(app);
  await app.register(certificateRoutes);
  await app.ready();
});

after(async () => {
  await app.close();
});

test("POST /api/certificates/issue sin Authorization devuelve 401", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/certificates/issue",
    payload: { evaluationId: "11111111-1111-1111-1111-111111111111" },
  });
  assert.equal(response.statusCode, 401);
});

test("GET /api/certificates/:id/download sin Authorization devuelve 401", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/certificates/11111111-1111-1111-1111-111111111111/download",
  });
  assert.equal(response.statusCode, 401);
});
