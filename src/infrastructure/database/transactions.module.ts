import { Global, Module } from '@nestjs/common';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { ClsModule } from 'nestjs-cls';
import { TRANSACTION_RUNNER } from '../../shared/application/transaction-runner.js';
import { ClsTransactionRunner } from './cls-transaction.runner.js';
import { DatabaseModule } from './database.module.js';
import { DRIZZLE } from './drizzle.provider.js';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      plugins: [
        new ClsPluginTransactional({
          imports: [DatabaseModule],
          adapter: new TransactionalAdapterDrizzleOrm({
            drizzleInstanceToken: DRIZZLE,
          }),
        }),
      ],
    }),
  ],
  providers: [{ provide: TRANSACTION_RUNNER, useClass: ClsTransactionRunner }],
  exports: [TRANSACTION_RUNNER],
})
export class TransactionsModule {}
