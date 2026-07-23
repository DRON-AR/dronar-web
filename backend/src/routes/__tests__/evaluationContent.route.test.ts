import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { registerSecurity } from "../../plugins/security.js";
import { evaluationContentRoutes } from "../evaluationContent.js";

let app: FastifyInstance;

before(async () => {
  process.env.FRONTEND_ORIGIN = "http://localhost:3000";
  app = Fastify();
  await registerSecurity(app);
  await app.register(evaluationContentRoutes);
  await app.ready();
});

after(async () => {
  await app.close();
});

test("POST /api/evaluations/generate-questions sin Authorization devuelve 401", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/evaluations/generate-questions",
    payload: { courseId: "11111111-1111-1111-1111-111111111111", topic: "x" },
  });
  assert.equal(response.statusCode, 401);
});

test("PATCH /api/evaluations/questions/:id/review sin Authorization devuelve 401", async () => {
  const response = await app.inject({
    method: "PATCH",
    url: "/api/evaluations/questions/11111111-1111-1111-1111-111111111111/review",
    payload: { status: "APROBADA" },
  });
  assert.equal(response.statusCode, 401);
});
