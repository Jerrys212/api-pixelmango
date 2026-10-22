import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { Session } from '../../domain/session.entity.js';
import type { authSessions } from './auth.schema.js';

type SessionRow = InferSelectModel<typeof authSessions>;
type NewSessionRow = InferInsertModel<typeof authSessions>;

export const SessionMapper = {
  toDomain(row: SessionRow): Session {
    return Session.restore({
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
      replacedById: row.replacedById,
    });
  },

  toPersistence(session: Session): NewSessionRow {
    return {
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      revokedAt: session.revokedAt,
      replacedById: session.replacedById,
    };
  },
};
