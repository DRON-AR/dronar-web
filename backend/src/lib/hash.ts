import { createHash } from "node:crypto";

/**
 * Hash determinista para auditoría de IA. Nunca se guarda el prompt ni la
 * respuesta en texto claro en audit_prompts — solo este hash, para poder
 * verificar integridad/reproducibilidad sin persistir contenido potencialmente
 * sensible.
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
