import { test } from "node:test";
import assert from "node:assert/strict";
import { runPromptTemplate } from "../promptRunner.js";
import { makeFakeSupabase, makeFakeTable } from "./testSupabaseFake.js";

function supabaseWithAuditInsert(onInsert?: (payload: any) => void) {
  return makeFakeSupabase({
    audit_prompts: makeFakeTable({ insertResult: { error: null }, onInsert }),
  });
}

test("prompt_version desconocida -> 400, sin llamar a Claude", async () => {
  let called = false;
  const fakeCall = async () => {
    called = true;
    return { text: "x", raw: {} };
  };
  const result = await runPromptTemplate(
    supabaseWithAuditInsert(),
    { promptVersion: "v999.0", input: {}, userId: "u-1" },
    undefined,
    fakeCall
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
  assert.equal(called, false);
});

test("input inválido para la plantilla -> 400, sin llamar a Claude", async () => {
  let called = false;
  const fakeCall = async () => {
    called = true;
    return { text: "x", raw: {} };
  };
  const result = await runPromptTemplate(
    supabaseWithAuditInsert(),
    { promptVersion: "v1.0", input: {}, userId: "u-1" }, // falta nombreCurso/claim
    undefined,
    fakeCall
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
  assert.equal(called, false);
});

test("plantilla de texto (v1.0): éxito devuelve el texto crudo y audita con response_hash", async () => {
  const audited: any[] = [];
  const supabase = supabaseWithAuditInsert((p) => audited.push(p));
  const fakeCall = async () => ({ text: "<Hero>generado</Hero>", raw: {} });

  const result = await runPromptTemplate(
    supabase,
    { promptVersion: "v1.0", input: { nombreCurso: "X", claim: "Y" }, userId: "u-1" },
    undefined,
    fakeCall
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.output, "<Hero>generado</Hero>");
  assert.equal(audited.length, 1);
  assert.equal(audited[0].user_id, "u-1");
  assert.equal(audited[0].prompt_version, "v1.0");
  assert.ok(audited[0].response_hash);
});

test("plantilla JSON (v1.1): valida y parsea la respuesta contra outputSchema", async () => {
  const supabase = supabaseWithAuditInsert();
  const fakeCall = async () => ({
    text: JSON.stringify([{ question: "¿Altura máx?", options: ["50m", "120m"], correctOptionIndex: 1 }]),
    raw: {},
  });

  const result = await runPromptTemplate(
    supabase,
    {
      promptVersion: "v1.1",
      input: { courseName: "X", topic: "Y", numQuestions: 1, difficulty: "MEDIO" },
      userId: "u-1",
    },
    undefined,
    fakeCall
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    const output = result.output as any[];
    assert.equal(output.length, 1);
    assert.equal(output[0].correctOptionIndex, 1);
  }
});

test("plantilla JSON: Claude envuelto en fences de markdown igual se parsea", async () => {
  const supabase = supabaseWithAuditInsert();
  const fakeCall = async () => ({
    text: '```json\n[{"question":"q","options":["a","b"],"correctOptionIndex":0}]\n```',
    raw: {},
  });

  const result = await runPromptTemplate(
    supabase,
    { promptVersion: "v1.1", input: { courseName: "X", topic: "Y", numQuestions: 1, difficulty: "MEDIO" }, userId: "u-1" },
    undefined,
    fakeCall
  );

  assert.equal(result.ok, true);
});

test("plantilla JSON: texto no-JSON -> 502 'no devolvió un JSON válido'", async () => {
  const supabase = supabaseWithAuditInsert();
  const fakeCall = async () => ({ text: "esto no es JSON", raw: {} });

  const result = await runPromptTemplate(
    supabase,
    { promptVersion: "v1.1", input: { courseName: "X", topic: "Y", numQuestions: 1, difficulty: "MEDIO" }, userId: "u-1" },
    undefined,
    fakeCall
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 502);
    assert.match(result.error, /JSON válido/);
  }
});

test("plantilla JSON: JSON válido pero que no cumple el schema -> 502 con details", async () => {
  const supabase = supabaseWithAuditInsert();
  // correctOptionIndex fuera de rango de options
  const fakeCall = async () => ({
    text: JSON.stringify([{ question: "q", options: ["a", "b"], correctOptionIndex: 9 }]),
    raw: {},
  });

  const result = await runPromptTemplate(
    supabase,
    { promptVersion: "v1.1", input: { courseName: "X", topic: "Y", numQuestions: 1, difficulty: "MEDIO" }, userId: "u-1" },
    undefined,
    fakeCall
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 502);
    assert.ok(result.details);
  }
});

test("si Claude lanza, se audita el intento fallido (response_hash null) y devuelve 502", async () => {
  const audited: any[] = [];
  const supabase = supabaseWithAuditInsert((p) => audited.push(p));
  const fakeCall = async () => {
    throw new Error("Claude API error 500");
  };

  const result = await runPromptTemplate(
    supabase,
    { promptVersion: "v1.0", input: { nombreCurso: "X", claim: "Y" }, userId: "u-1" },
    undefined,
    fakeCall
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 502);
  assert.equal(audited.length, 1);
  assert.equal(audited[0].response_hash, null);
});

test("un fallo al auditar se reporta vía onAuditError pero no tumba una generación exitosa", async () => {
  const supabase = makeFakeSupabase({
    audit_prompts: makeFakeTable({ insertResult: { error: { message: "tabla bloqueada" } } }),
  });
  const fakeCall = async () => ({ text: "ok", raw: {} });

  let reportedError: unknown = null;
  const result = await runPromptTemplate(
    supabase,
    { promptVersion: "v1.0", input: { nombreCurso: "X", claim: "Y" }, userId: "u-1" },
    (err) => {
      reportedError = err;
    },
    fakeCall
  );

  assert.equal(result.ok, true, "la generación exitosa no debe fallar por un problema de auditoría");
  assert.ok(reportedError, "el fallo de auditoría sí debe reportarse al caller");
});
