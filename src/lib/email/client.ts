import * as nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM || 'noreply@healthalign.com';

const isEmailConfigured = !!(host && user && pass);

let transporter: nodemailer.Transporter | null = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // Use SSL/TLS for port 465
    auth: {
      user,
      pass,
    },
  });
  console.log('Nodemailer SMTP Transporter initialized.');
} else {
  console.log('SMTP mail parameters are missing. Using log-to-console Mock Email client.');
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    if (isEmailConfigured && transporter) {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      console.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`
========================================
[MOCK EMAIL DISPATCHED]
To: ${to}
Subject: ${subject}
From: ${from}
Text content: ${text}
========================================
      `);
      return { success: true, messageId: `mock-email-id-${Date.now()}` };
    }
  } catch (err: any) {
    console.error(`Failed to dispatch email to ${to}:`, err);
    return { success: false };
  }
}
