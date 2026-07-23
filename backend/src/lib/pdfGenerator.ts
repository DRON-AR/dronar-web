import type { Browser } from "puppeteer-core";

/**
 * Usa puppeteer-core (NO `puppeteer` completo) a propósito: en un
 * despliegue Docker/Render/Fargate se instala Chromium en la imagen (ver
 * backend/Dockerfile) y se apunta PUPPETEER_EXECUTABLE_PATH ahí — evita
 * que cada build descargue su propio binario de Chromium (más pesado,
 * más lento, y una fuente de builds no reproducibles).
 */
export type BrowserLauncher = () => Promise<Browser>;

async function defaultLauncher(): Promise<Browser> {
  const { launch } = await import("puppeteer-core");
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    throw new Error(
      "PUPPETEER_EXECUTABLE_PATH no configurada — ver backend/Dockerfile y .env.example."
    );
  }
  return launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function renderHtmlToPdf(
  html: string,
  launchBrowser: BrowserLauncher = defaultLauncher
): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
