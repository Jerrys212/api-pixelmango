import { Inject, Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { eq, sql } from 'drizzle-orm';
import type { DrizzleTransactionHost } from '../../../../infrastructure/database/index.js';
import { isUniqueViolation } from '../../../../infrastructure/database/postgres-errors.js';
import type { UserRepository } from '../../application/ports/user.repository.js';
import type { User } from '../../domain/user.entity.js';
import { EmailAlreadyRegisteredError } from '../../domain/user.errors.js';
import { UserMapper } from './user.mapper.js';
import { users } from './users.schema.js';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(
    @Inject(TransactionHost) private readonly txHost: DrizzleTransactionHost,
  ) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.txHost.tx
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.txHost.tx
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async create(user: User): Promise<void> {
    try {
      await this.txHost.tx.insert(users).values(UserMapper.toPersistence(user));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyRegisteredError();
      }
      throw error;
    }
  }

  async update(user: User): Promise<void> {
    const { id, ...changes } = UserMapper.toPersistence(user);
    await this.txHost.tx.update(users).set(changes).where(eq(users.id, id));
  }
}
