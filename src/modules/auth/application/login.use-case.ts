import { Inject, Injectable } from '@nestjs/common';
import {
  EmailNotConfirmedError,
  InvalidCredentialsError,
} from '../domain/auth.errors.js';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from './ports/session.repository.js';
import { USER_ACCOUNTS, type UserAccounts } from './ports/user-accounts.js';
import { type AuthTokens, SessionIssuer } from './session-issuer.js';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_ACCOUNTS) private readonly users: UserAccounts,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(input: {
    email: string;
    password: string;
  }): Promise<AuthTokens> {
    const account = await this.users.verifyCredentials(
      input.email,
      input.password,
    );
    if (!account) {
      throw new InvalidCredentialsError();
    }
    if (!account.isEmailConfirmed) {
      throw new EmailNotConfirmedError();
    }

    const { session, tokens } = await this.sessionIssuer.prepare(
      account.id,
      new Date(),
    );
    await this.sessions.create(session);
    return tokens;
  }
}
