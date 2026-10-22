import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../../shared/application/transaction-runner.js';
import { MAIL_SERVICE, type MailService } from './ports/mail.service.js';
import { USER_ACCOUNTS, type UserAccounts } from './ports/user-accounts.js';
import { UserTokenIssuer } from './user-token-issuer.js';

@Injectable()
export class ResendConfirmationUseCase {
  private readonly logger = new Logger(ResendConfirmationUseCase.name);

  constructor(
    @Inject(USER_ACCOUNTS) private readonly users: UserAccounts,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    @Inject(TRANSACTION_RUNNER) private readonly transaction: TransactionRunner,
    private readonly userTokens: UserTokenIssuer,
  ) {}

  async execute(input: { email: string }): Promise<void> {
    const account = await this.users.findByEmail(input.email);
    if (!account || account.isEmailConfirmed) {
      return;
    }

    const token = await this.transaction.run(() =>
      this.userTokens.issue(account.id, 'email_confirmation', new Date()),
    );

    try {
      await this.mail.sendAccountConfirmation({
        to: account.email,
        name: account.name,
        token,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo reenviar la confirmación al usuario ${account.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
