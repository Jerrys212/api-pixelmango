import argon2 from 'argon2';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { User } from '../src/modules/users/domain/user.entity.js';
import { UserMapper } from '../src/modules/users/infrastructure/persistence/user.mapper.js';
import { users } from '../src/modules/users/infrastructure/persistence/users.schema.js';

export const SEED_PASSWORD = 'Password123!';

const SEED_USERS = [
  { email: 'ana.lopez@example.com', name: 'Ana López', confirmed: true },
  { email: 'carlos.ruiz@example.com', name: 'Carlos Ruiz', confirmed: true },
  { email: 'maria.garcia@example.com', name: 'María García', confirmed: true },
  {
    email: 'luis.martinez@example.com',
    name: 'Luis Martínez',
    confirmed: true,
  },
  {
    email: 'sofia.sin.confirmar@example.com',
    name: 'Sofía Pérez',
    confirmed: false,
  },
];

export async function seedUsers(db: NodePgDatabase): Promise<number> {
  const passwordHash = await argon2.hash(SEED_PASSWORD, {
    type: argon2.argon2id,
  });
  const now = new Date();

  const rows = SEED_USERS.map(({ email, name, confirmed }) => {
    const user = User.register({ email, name, passwordHash, now });
    if (confirmed) {
      user.confirmEmail(now);
    }
    return UserMapper.toPersistence(user);
  });

  const inserted = await db
    .insert(users)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: users.id });
  return inserted.length;
}
