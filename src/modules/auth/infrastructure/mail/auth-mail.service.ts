import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../../infrastructure/config/index.js';
import {
  MAIL_SENDER,
  type MailSender,
} from '../../../../infrastructure/mail/index.js';
import type {
  AuthMailInput,
  MailService,
} from '../../application/ports/mail.service.js';
import { accountConfirmationEmail } from './templates/account-confirmation.template.js';
import { passwordResetEmail } from './templates/password-reset.template.js';

@Injectable()
export class AuthMailService implements MailService {
  constructor(
    @Inject(MAIL_SENDER) private readonly sender: MailSender,
    private readonly config: ConfigService<Env, true>,
  ) {}

  sendAccountConfirmation({ to, name, token }: AuthMailInput): Promise<void> {
    const url = withToken(
      this.config.get('FRONTEND_CONFIRM_EMAIL_URL', { infer: true }),
      token,
    );
    return this.sender.send(accountConfirmationEmail({ to, name, url }));
  }

  sendPasswordReset({ to, name, token }: AuthMailInput): Promise<void> {
    const url = withToken(
      this.config.get('FRONTEND_RESET_PASSWORD_URL', { infer: true }),
      token,
    );
    return this.sender.send(passwordResetEmail({ to, name, url }));
  }
}

function withToken(baseUrl: string, token: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}
