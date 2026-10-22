import type { TransactionRunner } from '../../../../shared/application/transaction-runner.js';
import { Session } from '../../domain/session.entity.js';
import {
  UserToken,
  type UserTokenType,
} from '../../domain/user-token.entity.js';
import type {
  AuthTokenService,
  RefreshTokenClaims,
} from '../ports/auth-token.service.js';
import type { AuthMailInput, MailService } from '../ports/mail.service.js';
import type { SessionRepository } from '../ports/session.repository.js';
import type { AccountSummary, UserAccounts } from '../ports/user-accounts.js';
import type { UserTokenRepository } from '../ports/user-token.repository.js';

export class PassthroughTransactionRunner implements TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}

export class InMemorySessionRepository implements SessionRepository {
  readonly rows = new Map<string, Session>();

  create(session: Session): Promise<void> {
    this.rows.set(session.id, session);
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<Session | null> {
    return Promise.resolve(this.findRow(tokenHash) ?? null);
  }

  async rotate(
    currentTokenHash: string,
    replacement: Session,
    now: Date,
  ): Promise<boolean> {
    const current = this.findRow(currentTokenHash);
    if (
      !current ||
      current.userId !== replacement.userId ||
      !current.isActive(now)
    ) {
      return false;
    }
    this.replace(current, { revokedAt: now, replacedById: replacement.id });
    await this.create(replacement);
    return true;
  }

  revoke(tokenHash: string, now: Date): Promise<void> {
    const current = this.findRow(tokenHash);
    if (current && !current.isRevoked) {
      this.replace(current, { revokedAt: now });
    }
    return Promise.resolve();
  }

  revokeAllForUser(userId: string, now: Date): Promise<void> {
    for (const session of this.rows.values()) {
      if (session.userId === userId && !session.isRevoked) {
        this.replace(session, { revokedAt: now });
      }
    }
    return Promise.resolve();
  }

  activeFor(userId: string, now = new Date()): Session[] {
    return [...this.rows.values()].filter(
      (session) => session.userId === userId && session.isActive(now),
    );
  }

  private findRow(tokenHash: string): Session | undefined {
    return [...this.rows.values()].find((row) => row.tokenHash === tokenHash);
  }

  private replace(
    session: Session,
    changes: Partial<{ revokedAt: Date; replacedById: string }>,
  ): void {
    this.rows.set(
      session.id,
      Session.restore({
        id: session.id,
        userId: session.userId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        revokedAt: changes.revokedAt ?? session.revokedAt,
        replacedById: changes.replacedById ?? session.replacedById,
      }),
    );
  }
}

export class InMemoryUserTokenRepository implements UserTokenRepository {
  readonly rows = new Map<string, UserToken>();

  create(token: UserToken): Promise<void> {
    this.rows.set(token.id, token);
    return Promise.resolve();
  }

  invalidateAllForUser(
    userId: string,
    type: UserTokenType,
    now: Date,
  ): Promise<void> {
    for (const token of this.rows.values()) {
      if (token.userId === userId && token.type === type && !token.consumedAt) {
        this.markConsumed(token, now);
      }
    }
    return Promise.resolve();
  }

  consume(
    tokenHash: string,
    type: UserTokenType,
    now: Date,
  ): Promise<UserToken | null> {
    const token = [...this.rows.values()].find(
      (row) =>
        row.tokenHash === tokenHash && row.type === type && row.isUsable(now),
    );
    return Promise.resolve(token ? this.markConsumed(token, now) : null);
  }

  private markConsumed(token: UserToken, now: Date): UserToken {
    const consumed = UserToken.restore({
      id: token.id,
      userId: token.userId,
      type: token.type,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      consumedAt: now,
      createdAt: token.createdAt,
    });
    this.rows.set(token.id, consumed);
    return consumed;
  }
}

export class FakeAuthTokenService implements AuthTokenService {
  private counter = 0;

  signAccessToken(userId: string): Promise<string> {
    return Promise.resolve(`access.${userId}.${++this.counter}`);
  }

  signRefreshToken({ userId, sessionId }: RefreshTokenClaims): Promise<string> {
    return Promise.resolve(`refresh.${userId}.${sessionId}`);
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
    const [kind, userId, sessionId] = token.split('.');
    return Promise.resolve(
      kind === 'refresh' && userId && sessionId ? { userId, sessionId } : null,
    );
  }
}

export class RecordingMailService implements MailService {
  readonly confirmations: AuthMailInput[] = [];
  readonly resets: AuthMailInput[] = [];
  failNext = false;

  sendAccountConfirmation(input: AuthMailInput): Promise<void> {
    return this.record(this.confirmations, input);
  }

  sendPasswordReset(input: AuthMailInput): Promise<void> {
    return this.record(this.resets, input);
  }

  private record(target: AuthMailInput[], input: AuthMailInput): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error('SMTP no disponible'));
    }
    target.push(input);
    return Promise.resolve();
  }
}

interface StoredAccount extends AccountSummary {
  password: string;
}

export class InMemoryUserAccounts implements UserAccounts {
  readonly accounts = new Map<string, StoredAccount>();

  register(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<AccountSummary> {
    const account: StoredAccount = {
      id: globalThis.crypto.randomUUID(),
      email: input.email.trim().toLowerCase(),
      name: input.name,
      isEmailConfirmed: false,
      password: input.password,
    };
    this.accounts.set(account.id, account);
    return Promise.resolve(summary(account));
  }

  findByEmail(email: string): Promise<AccountSummary | null> {
    const account = this.byEmail(email);
    return Promise.resolve(account ? summary(account) : null);
  }

  verifyCredentials(
    email: string,
    password: string,
  ): Promise<AccountSummary | null> {
    const account = this.byEmail(email);
    return Promise.resolve(
      account?.password === password ? summary(account) : null,
    );
  }

  confirmEmail(userId: string): Promise<void> {
    const account = this.accounts.get(userId);
    if (account) {
      account.isEmailConfirmed = true;
    }
    return Promise.resolve();
  }

  changePassword(userId: string, newPassword: string): Promise<void> {
    const account = this.accounts.get(userId);
    if (account) {
      account.password = newPassword;
    }
    return Promise.resolve();
  }

  private byEmail(email: string): StoredAccount | undefined {
    const normalized = email.trim().toLowerCase();
    return [...this.accounts.values()].find(
      (account) => account.email === normalized,
    );
  }
}

function summary({ id, email, name, isEmailConfirmed }: StoredAccount) {
  return { id, email, name, isEmailConfirmed };
}
