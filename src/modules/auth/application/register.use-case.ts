import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../../shared/application/transaction-runner.js';
import { MAIL_SERVICE, type MailService } from './ports/mail.service.js';
import {
  type AccountSummary,
  USER_ACCOUNTS,
  type UserAccounts,
} from './ports/user-accounts.js';
import { UserTokenIssuer } from './user-token-issuer.js';

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    @Inject(USER_ACCOUNTS) private readonly users: UserAccounts,
    @Inject(MAIL_SERVICE) private readonly mail: MailService,
    @Inject(TRANSACTION_RUNNER) private readonly transaction: TransactionRunner,
    private readonly userTokens: UserTokenIssuer,
  ) {}

  async execute(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<AccountSummary> {
    const { account, token } = await this.transaction.run(async () => {
      const account = await this.users.register(input);
      const token = await this.userTokens.issue(
        account.id,
        'email_confirmation',
        new Date(),
      );
      return { account, token };
    });

    try {
      await this.mail.sendAccountConfirmation({
        to: account.email,
        name: account.name,
        token,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de confirmación al usuario ${account.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return account;
  }
}
