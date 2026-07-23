import type { SupabaseClient } from "@supabase/supabase-js";

export const CERTIFICATES_BUCKET = "certificates";

/** Convención de rutas (ver supabase/migrations/0013): {user_id}/{certificate_id}.pdf */
export function buildCertificateStoragePath(userId: string, certificateId: string): string {
  return `${userId}/${certificateId}.pdf`;
}

export async function uploadCertificatePdf(
  supabase: SupabaseClient,
  path: string,
  pdfBuffer: Buffer
): Promise<void> {
  const { error } = await supabase.storage.from(CERTIFICATES_BUCKET).upload(path, pdfBuffer, {
    contentType: "application/pdf",
    upsert: false, // un certificado emitido no se sobreescribe
  });
  if (error) {
    throw new Error(`No se pudo subir el certificado a Storage: ${error.message}`);
  }
}

export async function createSignedCertificateUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSeconds = 300
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CERTIFICATES_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    throw new Error(`No se pudo generar el enlace de descarga: ${error?.message}`);
  }
  return data.signedUrl;
}
