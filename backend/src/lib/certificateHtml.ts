/**
 * Texto obligatorio del certificado, EXACTO como lo exige la spec del
 * proyecto (incluida la cláusula NIST) — no parafrasear ni acortar.
 * [Nombre] se reemplaza por el nombre real del titular.
 */
const CERTIFICATE_TEXT_TEMPLATE =
  'Camper Aeronautical certifica que [Nombre] completó la evaluación basada en métodos de prueba desarrollados por el National Institute of Standards and Technology (NIST). Este certificado no implica respaldo oficial de NIST.';

export interface CertificateData {
  fullName: string;
  courseName: string;
  code: string;
  issuedAt: Date;
}

/** Devuelve el texto plano exacto que se guarda en certificates.certificate_text. */
export function buildCertificateText(fullName: string): string {
  return CERTIFICATE_TEXT_TEMPLATE.replace("[Nombre]", fullName);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * HTML autocontenido (sin dependencias externas — nada de fuentes de
 * Google ni CSS remoto) para que Puppeteer lo renderice sin necesitar
 * salida de red desde el proceso del backend.
 */
export function buildCertificateHtml(data: CertificateData): string {
  const safeName = escapeHtml(data.fullName);
  const safeCourse = escapeHtml(data.courseName);
  const safeCode = escapeHtml(data.code);
  const issuedAtLabel = data.issuedAt.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const bodyText = escapeHtml(buildCertificateText(data.fullName));

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    width: 297mm;
    height: 210mm;
    background: #050b14;
    color: #c9d9ec;
    font-family: Georgia, 'Times New Roman', serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .frame {
    width: 260mm;
    height: 175mm;
    border: 2px solid #12345c;
    border-radius: 12px;
    padding: 14mm 18mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .eyebrow {
    font-family: 'Courier New', monospace;
    font-size: 11pt;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #e8b34a;
  }
  h1 {
    font-size: 30pt;
    margin: 6mm 0 0 0;
    color: #c9d9ec;
    font-weight: normal;
  }
  .course {
    font-size: 16pt;
    color: #7fc4ff;
    margin-top: 4mm;
  }
  .statement {
    font-size: 12.5pt;
    line-height: 1.6;
    max-width: 190mm;
    margin-top: 8mm;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-family: 'Courier New', monospace;
    font-size: 9.5pt;
    color: #7fa0c4;
    border-top: 1px solid #12345c;
    padding-top: 6mm;
  }
  .footer strong { color: #c9d9ec; }
</style>
</head>
<body>
  <div class="frame">
    <div>
      <p class="eyebrow">Camper Aeronautical &mdash; DRONAR</p>
      <h1>${safeName}</h1>
      <p class="course">${safeCourse}</p>
      <p class="statement">${bodyText}</p>
    </div>
    <div class="footer">
      <span>Emitido: <strong>${issuedAtLabel}</strong></span>
      <span>Código de verificación: <strong>${safeCode}</strong></span>
    </div>
  </div>
</body>
</html>`;
}
