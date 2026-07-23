import { test } from "node:test";
import assert from "node:assert/strict";
import { claudeRequestSchema } from "../schemas.js";

test("acepta un body válido", () => {
  const result = claudeRequestSchema.safeParse({ prompt_version: "v1.0", input: { a: 1 } });
  assert.equal(result.success, true);
});

test("rechaza sin prompt_version", () => {
  const result = claudeRequestSchema.safeParse({ input: {} });
  assert.equal(result.success, false);
});

test("rechaza prompt_version vacío", () => {
  const result = claudeRequestSchema.safeParse({ prompt_version: "", input: {} });
  assert.equal(result.success, false);
});

test("rechaza prompt_version absurdamente largo (posible payload malicioso)", () => {
  const result = claudeRequestSchema.safeParse({ prompt_version: "v".repeat(500), input: {} });
  assert.equal(result.success, false);
});
