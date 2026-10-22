import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { minutes, ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../../infrastructure/config/index.js';
import { UsersFacade, UsersModule } from '../users/index.js';
import { ConfirmEmailUseCase } from './application/confirm-email.use-case.js';
import { ForgotPasswordUseCase } from './application/forgot-password.use-case.js';
import { LoginUseCase } from './application/login.use-case.js';
import { LogoutUseCase } from './application/logout.use-case.js';
import { AUTH_TOKEN_SERVICE } from './application/ports/auth-token.service.js';
import { MAIL_SERVICE } from './application/ports/mail.service.js';
import { SESSION_REPOSITORY } from './application/ports/session.repository.js';
import { USER_ACCOUNTS } from './application/ports/user-accounts.js';
import { USER_TOKEN_REPOSITORY } from './application/ports/user-token.repository.js';
import { RefreshSessionUseCase } from './application/refresh-session.use-case.js';
import { RegisterUseCase } from './application/register.use-case.js';
import { ResendConfirmationUseCase } from './application/resend-confirmation.use-case.js';
import { ResetPasswordUseCase } from './application/reset-password.use-case.js';
import { SessionIssuer } from './application/session-issuer.js';
import { UserTokenIssuer } from './application/user-token-issuer.js';
import { AuthMailService } from './infrastructure/mail/auth-mail.service.js';
import { DrizzleSessionRepository } from './infrastructure/persistence/drizzle-session.repository.js';
import { DrizzleUserTokenRepository } from './infrastructure/persistence/drizzle-user-token.repository.js';
import { JwtAuthTokenService } from './infrastructure/security/jwt-auth-token.service.js';
import { AuthController } from './presentation/auth.controller.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({}),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ name: 'default', limit: 10, ttl: minutes(1) }],
        skipIf: () => config.get('NODE_ENV', { infer: true }) === 'test',
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    ConfirmEmailUseCase,
    ResendConfirmationUseCase,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    SessionIssuer,
    UserTokenIssuer,
    { provide: USER_ACCOUNTS, useExisting: UsersFacade },
    { provide: SESSION_REPOSITORY, useClass: DrizzleSessionRepository },
    { provide: USER_TOKEN_REPOSITORY, useClass: DrizzleUserTokenRepository },
    { provide: AUTH_TOKEN_SERVICE, useClass: JwtAuthTokenService },
    { provide: MAIL_SERVICE, useClass: AuthMailService },
  ],
})
export class AuthModule {}
