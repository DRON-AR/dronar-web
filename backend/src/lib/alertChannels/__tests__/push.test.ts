import { test, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import webpush from "web-push";
import { sendAlertPush } from "../push.js";

const ORIGINAL_ENV = { ...process.env };
let vapidKeys: { publicKey: string; privateKey: string };

before(() => {
  // Claves VAPID reales (crypto local, sin red) — setVapidDetails valida
  // el formato, así que no sirven strings arbitrarios como "test-key".
  vapidKeys = webpush.generateVAPIDKeys();
});

beforeEach(() => {
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  process.env.VAPID_SUBJECT = "mailto:ops@camperaeronautical.com";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("no hace nada si no hay suscripciones", async () => {
  let called = false;
  const fakeSend = (async () => {
    called = true;
    return {} as any;
  }) as typeof webpush.sendNotification;

  await sendAlertPush([], { title: "t", body: "b" }, fakeSend);
  assert.equal(called, false);
});

test("envía a cada suscripción con endpoint y keys correctos", async () => {
  const calls: any[] = [];
  const fakeSend = (async (subscription: any, payload: any) => {
    calls.push({ subscription, payload });
    return {} as any;
  }) as typeof webpush.sendNotification;

  await sendAlertPush(
    [{ endpoint: "https://push.example.com/a", p256dh: "p256", auth: "auth1" }],
    { title: "DRONAR", body: "mensaje" },
    fakeSend
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].subscription.endpoint, "https://push.example.com/a");
  assert.equal(calls[0].subscription.keys.p256dh, "p256");
  assert.deepEqual(JSON.parse(calls[0].payload), { title: "DRONAR", body: "mensaje" });
});

test("una suscripción que falla no impide que se envíe a las demás", async () => {
  const calls: string[] = [];
  const fakeSend = (async (subscription: any) => {
    calls.push(subscription.endpoint);
    if (subscription.endpoint === "https://push.example.com/expired") {
      throw new Error("410 Gone");
    }
    return {} as any;
  }) as typeof webpush.sendNotification;

  await sendAlertPush(
    [
      { endpoint: "https://push.example.com/expired", p256dh: "p", auth: "a" },
      { endpoint: "https://push.example.com/valid", p256dh: "p", auth: "a" },
    ],
    { title: "t", body: "b" },
    fakeSend
  );

  assert.deepEqual(calls.sort(), ["https://push.example.com/expired", "https://push.example.com/valid"]);
});
