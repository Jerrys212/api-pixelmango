import { escapeHtml } from '../../../../../infrastructure/mail/index.js';

export interface ActionEmailContent {
  title: string;
  greetingName: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  expiryNotice: string;
  ignoreNotice: string;
}

export function renderActionEmail(content: ActionEmailContent): {
  html: string;
  text: string;
} {
  const name = escapeHtml(content.greetingName);
  const url = escapeHtml(content.actionUrl);

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(content.title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;">
            <tr><td>
              <h1 style="margin:0 0 16px;font-size:22px;">${escapeHtml(content.title)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Hola ${name},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${escapeHtml(content.intro)}</p>
              <p style="margin:0 0 24px;">
                <a href="${url}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px;">${escapeHtml(content.actionLabel)}</a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#52525b;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
              <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${url}" style="color:#2563eb;">${url}</a></p>
              <p style="margin:0 0 8px;font-size:13px;color:#52525b;">${escapeHtml(content.expiryNotice)}</p>
              <p style="margin:0;font-size:13px;color:#52525b;">${escapeHtml(content.ignoreNotice)}</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hola ${content.greetingName},`,
    '',
    content.intro,
    '',
    `${content.actionLabel}: ${content.actionUrl}`,
    '',
    content.expiryNotice,
    content.ignoreNotice,
  ].join('\n');

  return { html, text };
}
