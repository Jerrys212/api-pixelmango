import { DomainError } from '../../../shared/domain/domain-error.js';

export class EmailAlreadyRegisteredError extends DomainError {
  constructor() {
    super(
      'EMAIL_ALREADY_REGISTERED',
      'El correo electrónico ya está registrado',
    );
  }
}

export class UserNotFoundError extends DomainError {
  constructor() {
    super('USER_NOT_FOUND', 'El usuario no existe');
  }
}
