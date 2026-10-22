import { DomainError } from '../../../shared/domain/domain-error.js';

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Credenciales inválidas');
  }
}

export class EmailNotConfirmedError extends DomainError {
  constructor() {
    super(
      'EMAIL_NOT_CONFIRMED',
      'Debes confirmar tu correo electrónico antes de iniciar sesión',
    );
  }
}

export class InvalidTokenError extends DomainError {
  constructor() {
    super('INVALID_OR_EXPIRED_TOKEN', 'El enlace no es válido o ha expirado');
  }
}

export class InvalidRefreshTokenError extends DomainError {
  constructor() {
    super(
      'INVALID_REFRESH_TOKEN',
      'La sesión no es válida o ha expirado. Inicia sesión de nuevo',
    );
  }
}

export class RefreshTokenReusedError extends DomainError {
  constructor() {
    super(
      'REFRESH_TOKEN_REUSED',
      'Se detectó un uso indebido de la sesión. Inicia sesión de nuevo',
    );
  }
}
