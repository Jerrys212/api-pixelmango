import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { USER_TOKEN_TYPES } from '../../domain/user-token.entity.js';

export const authUserTokenType = pgEnum(
  'auth_user_token_type',
  USER_TOKEN_TYPES,
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedById: uuid('replaced_by_id'),
  },
  (table) => [
    uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash),
    index('auth_sessions_user_id_idx').on(table.userId),
  ],
);

export const authUserTokens = pgTable(
  'auth_user_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    type: authUserTokenType('type').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('auth_user_tokens_token_hash_unique').on(table.tokenHash),
    index('auth_user_tokens_user_id_type_idx').on(table.userId, table.type),
  ],
);
