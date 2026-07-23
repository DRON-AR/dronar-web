import { randomBytes } from "node:crypto";

/**
 * Código público de verificación del certificado (columna certificates.code,
 * UNIQUE). Formato: DRONAR-<año>-<6 alfanumérico en mayúsculas>.
 * No es un secreto: se imprime en el PDF para que cualquiera pueda
 * verificar el certificado contactando a Camper Aeronautical.
 */
export function generateCertificateCode(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const random = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `DRONAR-${year}-${random}`;
}
