import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { UserToken } from '../../domain/user-token.entity.js';
import type { authUserTokens } from './auth.schema.js';

type UserTokenRow = InferSelectModel<typeof authUserTokens>;
type NewUserTokenRow = InferInsertModel<typeof authUserTokens>;

export const UserTokenMapper = {
  toDomain(row: UserTokenRow): UserToken {
    return UserToken.restore({
      id: row.id,
      userId: row.userId,
      type: row.type,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt,
      createdAt: row.createdAt,
    });
  },

  toPersistence(token: UserToken): NewUserTokenRow {
    return {
      id: token.id,
      userId: token.userId,
      type: token.type,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      consumedAt: token.consumedAt,
      createdAt: token.createdAt,
    };
  },
};
