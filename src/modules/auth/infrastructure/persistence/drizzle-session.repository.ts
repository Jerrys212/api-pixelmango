import { Inject, Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { DrizzleTransactionHost } from '../../../../infrastructure/database/index.js';
import type { SessionRepository } from '../../application/ports/session.repository.js';
import type { Session } from '../../domain/session.entity.js';
import { authSessions } from './auth.schema.js';
import { SessionMapper } from './session.mapper.js';

@Injectable()
export class DrizzleSessionRepository implements SessionRepository {
  constructor(
    @Inject(TransactionHost) private readonly txHost: DrizzleTransactionHost,
  ) {}

  async create(session: Session): Promise<void> {
    await this.txHost.tx
      .insert(authSessions)
      .values(SessionMapper.toPersistence(session));
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const [row] = await this.txHost.tx
      .select()
      .from(authSessions)
      .where(eq(authSessions.tokenHash, tokenHash))
      .limit(1);
    return row ? SessionMapper.toDomain(row) : null;
  }

  async rotate(
    currentTokenHash: string,
    replacement: Session,
    now: Date,
  ): Promise<boolean> {
    const revoked = await this.txHost.tx
      .update(authSessions)
      .set({ revokedAt: now, replacedById: replacement.id })
      .where(
        and(
          eq(authSessions.tokenHash, currentTokenHash),
          eq(authSessions.userId, replacement.userId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
        ),
      )
      .returning({ id: authSessions.id });

    if (revoked.length === 0) {
      return false;
    }
    await this.create(replacement);
    return true;
  }

  async revoke(tokenHash: string, now: Date): Promise<void> {
    await this.txHost.tx
      .update(authSessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
        ),
      );
  }

  async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.txHost.tx
      .update(authSessions)
      .set({ revokedAt: now })
      .where(
        and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)),
      );
  }
}
