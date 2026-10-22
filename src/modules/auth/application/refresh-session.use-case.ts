import { Inject, Injectable } from '@nestjs/common';
import {
  TRANSACTION_RUNNER,
  type TransactionRunner,
} from '../../../shared/application/transaction-runner.js';
import {
  InvalidRefreshTokenError,
  RefreshTokenReusedError,
} from '../domain/auth.errors.js';
import {
  AUTH_TOKEN_SERVICE,
  type AuthTokenService,
} from './ports/auth-token.service.js';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from './ports/session.repository.js';
import { hashToken } from './secure-token.js';
import { type AuthTokens, SessionIssuer } from './session-issuer.js';

@Injectable()
export class RefreshSessionUseCase {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokens: AuthTokenService,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TRANSACTION_RUNNER) private readonly transaction: TransactionRunner,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(input: { refreshToken: string }): Promise<AuthTokens> {
    const claims = await this.tokens.verifyRefreshToken(input.refreshToken);
    if (!claims) {
      throw new InvalidRefreshTokenError();
    }

    const now = new Date();
    const tokenHash = hashToken(input.refreshToken);
    const { session, tokens } = await this.sessionIssuer.prepare(
      claims.userId,
      now,
    );

    const rotated = await this.transaction.run(() =>
      this.sessions.rotate(tokenHash, session, now),
    );
    if (rotated) {
      return tokens;
    }

    const presented = await this.sessions.findByTokenHash(tokenHash);
    if (presented?.isRevoked) {
      await this.sessions.revokeAllForUser(presented.userId, now);
      throw new RefreshTokenReusedError();
    }
    throw new InvalidRefreshTokenError();
  }
}
