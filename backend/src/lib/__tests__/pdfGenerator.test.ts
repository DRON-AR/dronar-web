import { test } from "node:test";
import assert from "node:assert/strict";
import { renderHtmlToPdf, type BrowserLauncher } from "../pdfGenerator.js";

function makeFakeBrowser(opts: {
  onSetContent?: (html: string) => void;
  pdfImpl?: () => Promise<Uint8Array>;
}) {
  let closed = false;
  const fakePage = {
    setContent: async (html: string, _o: unknown) => {
      opts.onSetContent?.(html);
    },
    pdf: opts.pdfImpl ?? (async () => new Uint8Array([1, 2, 3])),
  };
  const fakeBrowser = {
    newPage: async () => fakePage,
    close: async () => {
      closed = true;
    },
  };
  return { fakeBrowser, isClosed: () => closed };
}

test("renderiza el HTML dado, genera el PDF y devuelve un Buffer", async () => {
  let captured = "";
  const { fakeBrowser, isClosed } = makeFakeBrowser({
    onSetContent: (html) => {
      captured = html;
    },
  });
  const launcher: BrowserLauncher = async () => fakeBrowser as any;

  const result = await renderHtmlToPdf("<html>hola</html>", launcher);

  assert.equal(captured, "<html>hola</html>");
  assert.ok(Buffer.isBuffer(result));
  assert.deepEqual([...result], [1, 2, 3]);
  assert.equal(isClosed(), true, "el browser debe cerrarse tras generar el PDF");
});

test("cierra el browser incluso si page.pdf() lanza (evita fugas de proceso Chromium)", async () => {
  const { fakeBrowser, isClosed } = makeFakeBrowser({
    pdfImpl: async () => {
      throw new Error("fallo simulado de renderizado");
    },
  });
  const launcher: BrowserLauncher = async () => fakeBrowser as any;

  await assert.rejects(() => renderHtmlToPdf("<html></html>", launcher), /fallo simulado/);
  assert.equal(isClosed(), true, "el browser debe cerrarse incluso si pdf() falla");
});
