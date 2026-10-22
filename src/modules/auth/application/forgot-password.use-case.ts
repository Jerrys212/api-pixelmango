import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../../shared/application/transaction-runner.js';
import { MAIL_SERVICE, type MailService } from './ports/mail.service.js';
import { USER_ACCOUNTS, type UserAccounts } from './ports/user-accounts.js';
import { UserTokenIssuer } from './user-token-issuer.js';

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    @Inject(USER_ACCOUNTS) private readonly users: UserAccounts,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    @Inject(TRANSACTION_RUNNER) private readonly transaction: TransactionRunner,
    private readonly userTokens: UserTokenIssuer,
  ) {}

  async execute(input: { email: string }): Promise<void> {
    const account = await this.users.findByEmail(input.email);
    if (!account) {
      return;
    }

    const token = await this.transaction.run(() =>
      this.userTokens.issue(account.id, 'password_reset', new Date()),
    );

    try {
      await this.mail.sendPasswordReset({
        to: account.email,
        name: account.name,
        token,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de recuperación al usuario ${account.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
