import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { callClaude } from "../claudeClient.js";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.CLAUDE_API_KEY = "test-key";
  process.env.CLAUDE_MODEL = "claude-test-model";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("lanza si falta CLAUDE_API_KEY", async () => {
  delete process.env.CLAUDE_API_KEY;
  await assert.rejects(() => callClaude("hola"), /CLAUDE_API_KEY/);
});

test("lanza si falta CLAUDE_MODEL", async () => {
  delete process.env.CLAUDE_MODEL;
  await assert.rejects(() => callClaude("hola"), /CLAUDE_MODEL/);
});

test("envía el modelo, prompt y max_tokens correctos, y extrae el texto de la respuesta", async () => {
  let capturedBody: any = null;
  let capturedHeaders: any = null;

  const fakeFetch = (async (_url: string, init: any) => {
    capturedBody = JSON.parse(init.body);
    capturedHeaders = init.headers;
    return {
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "componente generado" }],
      }),
    } as Response;
  }) as typeof fetch;

  const result = await callClaude("genera un hero", 500, fakeFetch);

  assert.equal(result.text, "componente generado");
  assert.equal(capturedBody.model, "claude-test-model");
  assert.equal(capturedBody.max_tokens, 500);
  assert.equal(capturedBody.messages[0].content, "genera un hero");
  assert.equal(capturedHeaders["x-api-key"], "test-key");
});

test("lanza un error legible si la API responde con error", async () => {
  const fakeFetch = (async () => {
    return {
      ok: false,
      status: 429,
      text: async () => "rate limited upstream",
    } as Response;
  }) as typeof fetch;

  await assert.rejects(() => callClaude("hola", 100, fakeFetch), /429/);
});

test("concatena solo los bloques de tipo text (ignora otros tipos)", async () => {
  const fakeFetch = (async () => {
    return {
      ok: true,
      json: async () => ({
        content: [
          { type: "text", text: "parte 1" },
          { type: "tool_use", input: {} },
          { type: "text", text: "parte 2" },
        ],
      }),
    } as Response;
  }) as typeof fetch;

  const result = await callClaude("hola", 100, fakeFetch);
  assert.equal(result.text, "parte 1\nparte 2");
});
