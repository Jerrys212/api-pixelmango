import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { User } from '../../domain/user.entity.js';
import type { users } from './users.schema.js';

type UserRow = InferSelectModel<typeof users>;
type NewUserRow = InferInsertModel<typeof users>;

export const UserMapper = {
  toDomain(row: UserRow): User {
    return User.restore({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.passwordHash,
      emailConfirmedAt: row.emailConfirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toPersistence(user: User): NewUserRow {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      emailConfirmedAt: user.emailConfirmedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
};
