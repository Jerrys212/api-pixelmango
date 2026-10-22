import { Module } from '@nestjs/common';
import { GetUserProfileUseCase } from './application/get-user-profile.use-case.js';
import { PASSWORD_HASHER } from './application/ports/password-hasher.js';
import { USER_REPOSITORY } from './application/ports/user.repository.js';
import { UsersFacade } from './application/users.facade.js';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository.js';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password.hasher.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  controllers: [UsersController],
  providers: [
    UsersFacade,
    GetUserProfileUseCase,
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
  ],
  exports: [UsersFacade],
})
export class UsersModule {}
