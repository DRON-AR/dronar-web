import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sendAlertWebhook } from "../webhook.js";

const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  delete process.env.ALERT_WEBHOOK_URL;
  delete process.env.ALERT_WEBHOOK_SECRET;
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const samplePayload = {
  type: "GO_NO_GO_BLOCKED",
  severity: "CRITICA",
  message: "viento alto",
  relatedTable: "risk_cards",
  relatedId: "rc-1",
  createdAt: "2026-07-22T00:00:00Z",
};

test("se omite en silencio si ALERT_WEBHOOK_URL no está configurada", async () => {
  let called = false;
  const fakeFetch = (async () => {
    called = true;
    return { ok: true } as Response;
  }) as typeof fetch;

  await sendAlertWebhook(samplePayload, fakeFetch);
  assert.equal(called, false);
});

test("hace POST con el payload cuando la URL está configurada", async () => {
  process.env.ALERT_WEBHOOK_URL = "https://example.com/hook";
  let captured: any = null;
  const fakeFetch = (async (url: string, init: any) => {
    captured = { url, init };
    return { ok: true } as Response;
  }) as typeof fetch;

  await sendAlertWebhook(samplePayload, fakeFetch);

  assert.equal(captured.url, "https://example.com/hook");
  assert.equal(captured.init.method, "POST");
  assert.deepEqual(JSON.parse(captured.init.body), samplePayload);
});

test("firma el payload con HMAC cuando hay ALERT_WEBHOOK_SECRET", async () => {
  process.env.ALERT_WEBHOOK_URL = "https://example.com/hook";
  process.env.ALERT_WEBHOOK_SECRET = "s3cret";
  let captured: any = null;
  const fakeFetch = (async (_url: string, init: any) => {
    captured = init;
    return { ok: true } as Response;
  }) as typeof fetch;

  await sendAlertWebhook(samplePayload, fakeFetch);

  assert.ok(captured.headers["X-DRONAR-Signature"]);
  assert.match(captured.headers["X-DRONAR-Signature"], /^[0-9a-f]{64}$/);
});

test("sin secreto configurado, no envía la cabecera de firma", async () => {
  process.env.ALERT_WEBHOOK_URL = "https://example.com/hook";
  let captured: any = null;
  const fakeFetch = (async (_url: string, init: any) => {
    captured = init;
    return { ok: true } as Response;
  }) as typeof fetch;

  await sendAlertWebhook(samplePayload, fakeFetch);
  assert.equal(captured.headers["X-DRONAR-Signature"], undefined);
});

test("lanza si el webhook responde con error", async () => {
  process.env.ALERT_WEBHOOK_URL = "https://example.com/hook";
  const fakeFetch = (async () => ({ ok: false, status: 500 }) as Response) as typeof fetch;
  await assert.rejects(() => sendAlertWebhook(samplePayload, fakeFetch), /500/);
});
