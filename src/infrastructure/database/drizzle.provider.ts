import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDatabase = NodePgDatabase;

export type DrizzleTransactionHost = TransactionHost<
  TransactionalAdapterDrizzleOrm<DrizzleDatabase>
>;
