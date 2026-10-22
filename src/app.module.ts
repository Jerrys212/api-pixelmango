import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppConfigModule } from './infrastructure/config/index.js';
import {
  DatabaseModule,
  TransactionsModule,
} from './infrastructure/database/index.js';
import { HttpModule } from './infrastructure/http/index.js';
import { AuthenticationModule } from './infrastructure/http/auth/index.js';
import { MailModule } from './infrastructure/mail/index.js';
import { AuthModule } from './modules/auth/index.js';
import { UsersModule } from './modules/users/index.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    TransactionsModule,
    HttpModule,
    AuthenticationModule,
    MailModule,
    UsersModule,
    AuthModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'api',
    }),
  ],
})
export class AppModule {}
