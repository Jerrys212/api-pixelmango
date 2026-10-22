import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../../shared/application/transaction-runner.js';
import { InvalidTokenError } from '../domain/auth.errors.js';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from './ports/session.repository.js';
import { USER_ACCOUNTS, type UserAccounts } from './ports/user-accounts.js';
import {
  USER_TOKEN_REPOSITORY,
  type UserTokenRepository,
} from './ports/user-token.repository.js';
import { hashToken } from './secure-token.js';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_ACCOUNTS) private readonly users: UserAccounts,
    @Inject(USER_TOKEN_REPOSITORY)
    private readonly userTokens: UserTokenRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transaction: TransactionRunner,
  ) {}

  execute(input: { token: string; password: string }): Promise<void> {
    return this.transaction.run(async () => {
      const now = new Date();
      const consumed = await this.userTokens.consume(
        hashToken(input.token),
        'password_reset',
        now,
      );
      if (!consumed) {
        throw new InvalidTokenError();
      }
      await this.users.changePassword(consumed.userId, input.password);
      await this.sessions.revokeAllForUser(consumed.userId, now);
    });
  }
}
