import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../../shared/application/transaction-runner.js';
import { InvalidTokenError } from '../domain/auth.errors.js';
import { USER_ACCOUNTS, type UserAccounts } from './ports/user-accounts.js';
import {
  USER_TOKEN_REPOSITORY,
  type UserTokenRepository,
} from './ports/user-token.repository.js';
import { hashToken } from './secure-token.js';

@Injectable()
export class ConfirmEmailUseCase {
  constructor(
    @Inject(USER_ACCOUNTS) private readonly users: UserAccounts,
    @Inject(USER_TOKEN_REPOSITORY)
    private readonly userTokens: UserTokenRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transaction: TransactionRunner,
  ) {}

  execute(input: { token: string }): Promise<void> {
    return this.transaction.run(async () => {
      const consumed = await this.userTokens.consume(
        hashToken(input.token),
        'email_confirmation',
        new Date(),
      );
      if (!consumed) {
        throw new InvalidTokenError();
      }
      await this.users.confirmEmail(consumed.userId);
    });
  }
}
