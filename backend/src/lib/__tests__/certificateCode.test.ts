import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCertificateCode } from "../certificateCode.js";

test("formato DRONAR-<año>-<6 hex mayúsculas>", () => {
  const code = generateCertificateCode(new Date("2026-07-22T00:00:00Z"));
  assert.match(code, /^DRONAR-2026-[0-9A-F]{6}$/);
});

test("usa el año de la fecha dada, no el actual del sistema", () => {
  const code = generateCertificateCode(new Date("2030-01-01T00:00:00Z"));
  assert.match(code, /^DRONAR-2030-/);
});

test("dos llamadas producen códigos distintos", () => {
  const a = generateCertificateCode();
  const b = generateCertificateCode();
  assert.notEqual(a, b);
});
