import { test } from "node:test";
import assert from "node:assert/strict";
import { sha256 } from "../hash.js";

test("sha256 es determinista para el mismo input", () => {
  assert.equal(sha256("hola"), sha256("hola"));
});

test("sha256 produce hashes distintos para inputs distintos", () => {
  assert.notEqual(sha256("hola"), sha256("hola "));
});

test("sha256 devuelve un hex de 64 caracteres (SHA-256)", () => {
  assert.equal(sha256("dronar").length, 64);
  assert.match(sha256("dronar"), /^[0-9a-f]{64}$/);
});
