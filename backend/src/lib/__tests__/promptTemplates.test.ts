import { test } from "node:test";
import assert from "node:assert/strict";
import { getPromptTemplate, promptTemplates } from "../promptTemplates.js";

test("v1.0 (hero component) existe en el registro", () => {
  const t = getPromptTemplate("v1.0");
  assert.ok(t);
  assert.equal(t?.expected_output_format, "React+Tailwind+FramerMotion");
});

test("prompt_version desconocida devuelve undefined (no lanza)", () => {
  assert.equal(getPromptTemplate("v999.0"), undefined);
});

test("inputSchema de v1.0 rechaza input vacío", () => {
  const t = getPromptTemplate("v1.0")!;
  const result = t.inputSchema.safeParse({});
  assert.equal(result.success, false);
});

test("inputSchema de v1.0 acepta input válido y buildPrompt interpola las variables", () => {
  const t = getPromptTemplate("v1.0")!;
  const parsed = t.inputSchema.parse({ nombreCurso: "RPAS Básico", claim: "Vuela seguro" });
  const prompt = t.buildPrompt(parsed);
  assert.match(prompt, /RPAS Básico/);
  assert.match(prompt, /Vuela seguro/);
});

test("inputSchema de v1.0 rechaza un claim absurdamente largo", () => {
  const t = getPromptTemplate("v1.0")!;
  const result = t.inputSchema.safeParse({ nombreCurso: "X", claim: "y".repeat(1000) });
  assert.equal(result.success, false);
});

test("el registro está congelado (no se puede mutar en runtime)", () => {
  assert.throws(() => {
    // @ts-expect-error -- intencional: probar inmutabilidad
    promptTemplates["v1.0"] = undefined;
  });
});

// ---------- v1.1 (generación de preguntas) ----------

test("v1.1 existe, es JSON, y trae outputSchema para validar la respuesta de Claude", () => {
  const t = getPromptTemplate("v1.1")!;
  assert.ok(t);
  assert.equal(t.expected_output_format, "JSON");
  assert.ok(t.outputSchema, "v1.1 debe tener outputSchema — genera contenido que define respuestas correctas");
});

test("v1.1 inputSchema rechaza numQuestions fuera de rango (protege contra costos de generación excesivos)", () => {
  const t = getPromptTemplate("v1.1")!;
  const tooMany = t.inputSchema.safeParse({
    courseName: "X", topic: "Y", numQuestions: 21, difficulty: "MEDIO",
  });
  const zero = t.inputSchema.safeParse({
    courseName: "X", topic: "Y", numQuestions: 0, difficulty: "MEDIO",
  });
  assert.equal(tooMany.success, false);
  assert.equal(zero.success, false);
});

test("v1.1 buildPrompt interpola curso, tema, cantidad y dificultad", () => {
  const t = getPromptTemplate("v1.1")!;
  const input = t.inputSchema.parse({
    courseName: "RPAS Básico", topic: "Espacio aéreo", numQuestions: 5, difficulty: "DIFICIL",
  });
  const prompt = t.buildPrompt(input);
  assert.match(prompt, /RPAS Básico/);
  assert.match(prompt, /Espacio aéreo/);
  assert.match(prompt, /5 preguntas/);
  assert.match(prompt, /DIFICIL/);
});

test("v1.1 outputSchema acepta un array de preguntas bien formado", () => {
  const t = getPromptTemplate("v1.1")!;
  const result = t.outputSchema!.safeParse([
    { question: "¿Altura máxima?", options: ["50m", "120m", "300m"], correctOptionIndex: 1 },
  ]);
  assert.equal(result.success, true);
});

test("v1.1 outputSchema rechaza correctOptionIndex fuera de rango de options", () => {
  const t = getPromptTemplate("v1.1")!;
  const result = t.outputSchema!.safeParse([
    { question: "¿Altura máxima?", options: ["50m", "120m"], correctOptionIndex: 5 },
  ]);
  assert.equal(result.success, false);
});

test("v1.1 outputSchema rechaza un array vacío", () => {
  const t = getPromptTemplate("v1.1")!;
  assert.equal(t.outputSchema!.safeParse([]).success, false);
});

test("v1.1 outputSchema rechaza menos de 2 opciones", () => {
  const t = getPromptTemplate("v1.1")!;
  const result = t.outputSchema!.safeParse([{ question: "x", options: ["única"], correctOptionIndex: 0 }]);
  assert.equal(result.success, false);
});

// ---------- v1.2 (descripción de curso) ----------

test("v1.2 existe, es texto plano, sin outputSchema (no genera respuestas de examen)", () => {
  const t = getPromptTemplate("v1.2")!;
  assert.ok(t);
  assert.equal(t.expected_output_format, "text");
  assert.equal(t.outputSchema, undefined);
});

test("v1.2 buildPrompt interpola nombre, objetivos y duración", () => {
  const t = getPromptTemplate("v1.2")!;
  const input = t.inputSchema.parse({
    courseName: "RPAS Avanzado", objectives: "Operar en espacio controlado", durationHours: 40,
  });
  const prompt = t.buildPrompt(input);
  assert.match(prompt, /RPAS Avanzado/);
  assert.match(prompt, /Operar en espacio controlado/);
  assert.match(prompt, /40 horas/);
});
