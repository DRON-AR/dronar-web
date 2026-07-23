import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCertificateText, buildCertificateHtml } from "../certificateHtml.js";

const EXPECTED_SUFFIX =
  "completó la evaluación basada en métodos de prueba desarrollados por el National Institute of Standards and Technology (NIST). Este certificado no implica respaldo oficial de NIST.";

test("buildCertificateText preserva EXACTO el texto obligatorio (cláusula NIST)", () => {
  const text = buildCertificateText("Ana Torres");
  assert.equal(
    text,
    `Camper Aeronautical certifica que Ana Torres ${EXPECTED_SUFFIX}`
  );
});

test("buildCertificateText interpola distintos nombres correctamente", () => {
  assert.match(buildCertificateText("José Pérez"), /^Camper Aeronautical certifica que José Pérez /);
});

test("buildCertificateHtml incluye nombre, curso, código y la cláusula NIST completa", () => {
  const html = buildCertificateHtml({
    fullName: "Ana Torres",
    courseName: "RPAS Básico",
    code: "DRONAR-2026-ABC123",
    issuedAt: new Date("2026-07-22T00:00:00Z"),
  });
  assert.match(html, /Ana Torres/);
  assert.match(html, /RPAS Básico/);
  assert.match(html, /DRONAR-2026-ABC123/);
  assert.match(html, /National Institute of Standards and Technology \(NIST\)/);
  assert.match(html, /no implica respaldo oficial de NIST/);
});

test("buildCertificateHtml escapa HTML en campos interpolados (defensa contra inyección)", () => {
  const html = buildCertificateHtml({
    fullName: "<script>alert(1)</script>",
    courseName: "Curso <b>X</b>",
    code: "COD-1",
    issuedAt: new Date(),
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /Curso <b>X<\/b>/);
});

test("buildCertificateHtml no depende de fuentes ni CSS remoto (autocontenido)", () => {
  const html = buildCertificateHtml({
    fullName: "X",
    courseName: "Y",
    code: "Z",
    issuedAt: new Date(),
  });
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  assert.doesNotMatch(html, /<link[^>]+href=/);
});
