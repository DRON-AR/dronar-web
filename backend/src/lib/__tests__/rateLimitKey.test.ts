import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveRateLimitKey } from "../rateLimitKey.js";

function fakeRequest(authHeader?: string, ip = "203.0.113.5") {
  return { headers: { authorization: authHeader }, ip } as any;
}

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

test("usa el sub del JWT cuando hay Authorization Bearer bien formado", () => {
  const token = fakeJwt({ sub: "user-123" });
  const key = deriveRateLimitKey(fakeRequest(`Bearer ${token}`));
  assert.equal(key, "user:user-123");
});

test("cae a IP cuando no hay header Authorization", () => {
  const key = deriveRateLimitKey(fakeRequest(undefined));
  assert.equal(key, "ip:203.0.113.5");
});

test("cae a IP cuando el token no es un JWT válido (3 partes)", () => {
  const key = deriveRateLimitKey(fakeRequest("Bearer no-es-un-jwt"));
  assert.equal(key, "ip:203.0.113.5");
});

test("cae a IP cuando el payload no tiene sub", () => {
  const token = fakeJwt({ foo: "bar" });
  const key = deriveRateLimitKey(fakeRequest(`Bearer ${token}`));
  assert.equal(key, "ip:203.0.113.5");
});

test("cae a IP cuando el header no empieza con 'Bearer '", () => {
  const key = deriveRateLimitKey(fakeRequest("Basic abc123"));
  assert.equal(key, "ip:203.0.113.5");
});
