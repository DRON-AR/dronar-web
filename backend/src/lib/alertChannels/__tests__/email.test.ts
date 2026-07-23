import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { sendAlertEmail } from "../email.js";

const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  process.env.SMTP_FROM = "alertas@camperaeronautical.com";
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

test("no envía nada si no hay destinatarios (no es un error)", async () => {
  let called = false;
  const fakeTransport = { sendMail: async () => { called = true; } };
  await sendAlertEmail([], { subject: "x", message: "y" }, fakeTransport as any);
  assert.equal(called, false);
});

test("envía con from, to, subject y message correctos", async () => {
  let captured: any = null;
  const fakeTransport = {
    sendMail: async (opts: any) => {
      captured = opts;
    },
  };
  await sendAlertEmail(["a@test.com", "b@test.com"], { subject: "Alerta X", message: "Cuerpo" }, fakeTransport as any);

  assert.equal(captured.from, "alertas@camperaeronautical.com");
  assert.equal(captured.to, "a@test.com, b@test.com");
  assert.equal(captured.subject, "Alerta X");
  assert.equal(captured.text, "Cuerpo");
});

test("lanza si falta SMTP_FROM", async () => {
  delete process.env.SMTP_FROM;
  const fakeTransport = { sendMail: async () => {} };
  await assert.rejects(
    () => sendAlertEmail(["a@test.com"], { subject: "x", message: "y" }, fakeTransport as any),
    /SMTP_FROM/
  );
});
