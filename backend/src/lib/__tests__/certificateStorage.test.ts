import { test } from "node:test";
import assert from "node:assert/strict";
import {
  uploadCertificatePdf,
  createSignedCertificateUrl,
  buildCertificateStoragePath,
  CERTIFICATES_BUCKET,
} from "../certificateStorage.js";

function fakeSupabase(overrides: {
  upload?: (path: string, buf: Buffer, opts: unknown) => Promise<{ error: unknown }>;
  createSignedUrl?: (path: string, expiresIn: number) => Promise<{ data: unknown; error: unknown }>;
  onFromBucket?: (bucket: string) => void;
}) {
  return {
    storage: {
      from: (bucket: string) => {
        overrides.onFromBucket?.(bucket);
        return {
          upload: overrides.upload ?? (async () => ({ error: null })),
          createSignedUrl:
            overrides.createSignedUrl ??
            (async () => ({ data: { signedUrl: "https://example.com/signed" }, error: null })),
        };
      },
    },
  } as any;
}

test("buildCertificateStoragePath sigue la convención {user_id}/{certificate_id}.pdf", () => {
  assert.equal(buildCertificateStoragePath("user-1", "cert-1"), "user-1/cert-1.pdf");
});

test("uploadCertificatePdf sube al bucket 'certificates' con contentType application/pdf, sin upsert", async () => {
  let capturedBucket = "";
  let capturedArgs: any = null;
  const supabase = fakeSupabase({
    onFromBucket: (b) => (capturedBucket = b),
    upload: async (path, buf, opts) => {
      capturedArgs = { path, buf, opts };
      return { error: null };
    },
  });

  await uploadCertificatePdf(supabase, "u/c.pdf", Buffer.from("pdf-bytes"));

  assert.equal(capturedBucket, CERTIFICATES_BUCKET);
  assert.equal(capturedArgs.path, "u/c.pdf");
  assert.equal((capturedArgs.opts as any).contentType, "application/pdf");
  assert.equal((capturedArgs.opts as any).upsert, false);
});

test("uploadCertificatePdf lanza un error legible si Storage falla", async () => {
  const supabase = fakeSupabase({ upload: async () => ({ error: { message: "bucket no existe" } }) });
  await assert.rejects(
    () => uploadCertificatePdf(supabase, "x/y.pdf", Buffer.from("x")),
    /bucket no existe/
  );
});

test("createSignedCertificateUrl devuelve la URL firmada", async () => {
  const supabase = fakeSupabase({});
  const url = await createSignedCertificateUrl(supabase, "x/y.pdf");
  assert.equal(url, "https://example.com/signed");
});

test("createSignedCertificateUrl lanza si Supabase Storage responde con error", async () => {
  const supabase = fakeSupabase({
    createSignedUrl: async () => ({ data: null, error: { message: "objeto no encontrado" } }),
  });
  await assert.rejects(() => createSignedCertificateUrl(supabase, "x/y.pdf"), /objeto no encontrado/);
});
