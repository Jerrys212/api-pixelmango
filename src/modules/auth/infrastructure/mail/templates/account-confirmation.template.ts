import type { MailMessage } from '../../../../../infrastructure/mail/index.js';
import { renderActionEmail } from './action-email.template.js';

export function accountConfirmationEmail(input: {
  to: string;
  name: string;
  url: string;
}): MailMessage {
  const subject = 'Confirma tu cuenta';
  return {
    to: input.to,
    subject,
    ...renderActionEmail({
      title: subject,
      greetingName: input.name,
      intro:
        'Gracias por registrarte. Para activar tu cuenta, confirma tu correo electrónico.',
      actionLabel: 'Confirmar mi cuenta',
      actionUrl: input.url,
      expiryNotice:
        'Este enlace caduca en 24 horas y solo puede usarse una vez.',
      ignoreNotice: 'Si no creaste esta cuenta, puedes ignorar este correo.',
    }),
  };
}
