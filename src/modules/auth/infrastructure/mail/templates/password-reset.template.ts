import type { MailMessage } from '../../../../../infrastructure/mail/index.js';
import { renderActionEmail } from './action-email.template.js';

export function passwordResetEmail(input: {
  to: string;
  name: string;
  url: string;
}): MailMessage {
  const subject = 'Restablece tu contraseña';
  return {
    to: input.to,
    subject,
    ...renderActionEmail({
      title: subject,
      greetingName: input.name,
      intro:
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta.',
      actionLabel: 'Restablecer contraseña',
      actionUrl: input.url,
      expiryNotice: 'Este enlace caduca en 1 hora y solo puede usarse una vez.',
      ignoreNotice:
        'Si no solicitaste este cambio, ignora este correo: tu contraseña seguirá siendo la misma.',
    }),
  };
}
