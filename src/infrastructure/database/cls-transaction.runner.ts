import { Inject, Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionRunner } from '../../shared/application/transaction-runner.js';
import type { DrizzleTransactionHost } from './drizzle.provider.js';

@Injectable()
export class ClsTransactionRunner implements TransactionRunner {
  constructor(
    @Inject(TransactionHost) private readonly txHost: DrizzleTransactionHost,
  ) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.txHost.withTransaction(work);
  }
}
