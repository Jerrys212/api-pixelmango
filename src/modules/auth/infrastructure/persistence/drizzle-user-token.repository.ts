import { Inject, Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { DrizzleTransactionHost } from '../../../../infrastructure/database/index.js';
import type { UserTokenRepository } from '../../application/ports/user-token.repository.js';
import type {
  UserToken,
  UserTokenType,
} from '../../domain/user-token.entity.js';
import { authUserTokens } from './auth.schema.js';
import { UserTokenMapper } from './user-token.mapper.js';

@Injectable()
export class DrizzleUserTokenRepository implements UserTokenRepository {
  constructor(
    @Inject(TransactionHost) private readonly txHost: DrizzleTransactionHost,
  ) {}

  async create(token: UserToken): Promise<void> {
    await this.txHost.tx
      .insert(authUserTokens)
      .values(UserTokenMapper.toPersistence(token));
  }

  async invalidateAllForUser(
    userId: string,
    type: UserTokenType,
    now: Date,
  ): Promise<void> {
    await this.txHost.tx
      .update(authUserTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(authUserTokens.userId, userId),
          eq(authUserTokens.type, type),
          isNull(authUserTokens.consumedAt),
        ),
      );
  }

  async consume(
    tokenHash: string,
    type: UserTokenType,
    now: Date,
  ): Promise<UserToken | null> {
    const [row] = await this.txHost.tx
      .update(authUserTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(authUserTokens.tokenHash, tokenHash),
          eq(authUserTokens.type, type),
          isNull(authUserTokens.consumedAt),
          gt(authUserTokens.expiresAt, now),
        ),
      )
      .returning();
    return row ? UserTokenMapper.toDomain(row) : null;
  }
}
