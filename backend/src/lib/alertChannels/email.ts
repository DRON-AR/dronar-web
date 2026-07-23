import nodemailer, { type Transporter } from "nodemailer";

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport;
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) throw new Error("SMTP_URL no configurada.");
  cachedTransport = nodemailer.createTransport(smtpUrl);
  return cachedTransport;
}

export interface AlertEmailPayload {
  subject: string;
  message: string;
}

export async function sendAlertEmail(
  toAddresses: string[],
  payload: AlertEmailPayload,
  transport: Pick<Transporter, "sendMail"> = getTransport()
): Promise<void> {
  if (toAddresses.length === 0) return; // sin destinatarios no es un error, solo no hay nada que enviar

  const from = process.env.SMTP_FROM;
  if (!from) throw new Error("SMTP_FROM no configurada.");

  await transport.sendMail({
    from,
    to: toAddresses.join(", "),
    subject: payload.subject,
    text: payload.message,
  });
}
