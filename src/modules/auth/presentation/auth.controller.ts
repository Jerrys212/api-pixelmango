import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { minutes, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  ApiEnvelopeErrorResponse,
  ApiEnvelopeResponse,
  ResponseMessage,
} from '../../../infrastructure/http/index.js';
import { Public } from '../../../infrastructure/http/auth/index.js';
import { ConfirmEmailUseCase } from '../application/confirm-email.use-case.js';
import { ForgotPasswordUseCase } from '../application/forgot-password.use-case.js';
import { LoginUseCase } from '../application/login.use-case.js';
import { LogoutUseCase } from '../application/logout.use-case.js';
import { RefreshSessionUseCase } from '../application/refresh-session.use-case.js';
import { RegisterUseCase } from '../application/register.use-case.js';
import { ResendConfirmationUseCase } from '../application/resend-confirmation.use-case.js';
import { ResetPasswordUseCase } from '../application/reset-password.use-case.js';
import {
  AccessTokenResponseDto,
  RegisteredUserResponseDto,
} from './dto/auth.response.dto.js';
import {
  ForgotPasswordDto,
  ResendConfirmationDto,
} from './dto/email-request.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ConfirmEmailDto, ResetPasswordDto } from './dto/token-request.dto.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from './refresh-cookie.js';

const STRICT_LIMIT = { default: { limit: 5, ttl: minutes(1) } };
const EMAIL_LIMIT = { default: { limit: 3, ttl: minutes(1) } };

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUseCase,
    private readonly confirmEmail: ConfirmEmailUseCase,
    private readonly resendConfirmation: ResendConfirmationUseCase,
    private readonly login: LoginUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logout: LogoutUseCase,
    private readonly forgotPassword: ForgotPasswordUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle(STRICT_LIMIT)
  @ApiOperation({ operationId: 'auth_register', summary: 'Registrar usuario' })
  @ResponseMessage(
    'Usuario registrado. Revisa tu correo para confirmar tu cuenta',
  )
  @ApiEnvelopeResponse(RegisteredUserResponseDto, { status: 201 })
  @ApiEnvelopeErrorResponse(400, ['VALIDATION_ERROR'])
  @ApiEnvelopeErrorResponse(409, ['EMAIL_ALREADY_REGISTERED'])
  @ApiEnvelopeErrorResponse(429, ['TOO_MANY_REQUESTS'])
  async register(@Body() dto: RegisterDto): Promise<RegisteredUserResponseDto> {
    const account = await this.registerUser.execute(dto);
    return RegisteredUserResponseDto.from(account);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: 'auth_confirm', summary: 'Confirmar cuenta' })
  @ResponseMessage('Cuenta confirmada correctamente')
  @ApiEnvelopeResponse(null, { status: 200 })
  @ApiEnvelopeErrorResponse(400, [
    'INVALID_OR_EXPIRED_TOKEN',
    'VALIDATION_ERROR',
  ])
  async confirm(@Body() dto: ConfirmEmailDto): Promise<void> {
    await this.confirmEmail.execute(dto);
  }

  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(EMAIL_LIMIT)
  @ApiOperation({
    operationId: 'auth_resendConfirmation',
    summary: 'Reenviar correo de confirmación',
  })
  @ResponseMessage(
    'Si el correo está registrado y pendiente de confirmación, te enviaremos un nuevo enlace',
  )
  @ApiEnvelopeResponse(null, { status: 200 })
  @ApiEnvelopeErrorResponse(400, ['VALIDATION_ERROR'])
  @ApiEnvelopeErrorResponse(429, ['TOO_MANY_REQUESTS'])
  async resend(@Body() dto: ResendConfirmationDto): Promise<void> {
    await this.resendConfirmation.execute(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(STRICT_LIMIT)
  @ApiOperation({
    operationId: 'auth_login',
    summary: 'Iniciar sesión',
    description: `Devuelve el access token en el body y el refresh token en la cookie httpOnly \`${REFRESH_COOKIE_NAME}\` (path /auth).`,
  })
  @ResponseMessage('Sesión iniciada correctamente')
  @ApiEnvelopeResponse(AccessTokenResponseDto, { status: 200 })
  @ApiEnvelopeErrorResponse(400, ['VALIDATION_ERROR'])
  @ApiEnvelopeErrorResponse(401, ['INVALID_CREDENTIALS'])
  @ApiEnvelopeErrorResponse(403, ['EMAIL_NOT_CONFIRMED'])
  @ApiEnvelopeErrorResponse(429, ['TOO_MANY_REQUESTS'])
  async signIn(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponseDto> {
    const tokens = await this.login.execute(dto);
    setRefreshCookie(
      response,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );
    return AccessTokenResponseDto.from(tokens);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({
    operationId: 'auth_refresh',
    summary: 'Renovar el access token',
    description:
      'Lee el refresh token de la cookie, lo rota y emite una cookie nueva.',
  })
  @ResponseMessage('Sesión renovada correctamente')
  @ApiEnvelopeResponse(AccessTokenResponseDto, { status: 200 })
  @ApiEnvelopeErrorResponse(401, [
    'INVALID_REFRESH_TOKEN',
    'REFRESH_TOKEN_REUSED',
  ])
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenResponseDto> {
    try {
      const tokens = await this.refreshSession.execute({
        refreshToken: readRefreshCookie(request) ?? '',
      });
      setRefreshCookie(
        response,
        tokens.refreshToken,
        tokens.refreshTokenExpiresAt,
      );
      return AccessTokenResponseDto.from(tokens);
    } catch (error) {
      clearRefreshCookie(response);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({
    operationId: 'auth_logout',
    summary: 'Cerrar la sesión actual',
  })
  @ResponseMessage('Sesión cerrada correctamente')
  @ApiEnvelopeResponse(null, { status: 200 })
  async signOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.logout.execute({ refreshToken: readRefreshCookie(request) });
    clearRefreshCookie(response);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(EMAIL_LIMIT)
  @ApiOperation({
    operationId: 'auth_forgotPassword',
    summary: 'Solicitar restablecimiento de contraseña',
  })
  @ResponseMessage(
    'Si el correo está registrado, te enviaremos un enlace para restablecer tu contraseña',
  )
  @ApiEnvelopeResponse(null, { status: 200 })
  @ApiEnvelopeErrorResponse(400, ['VALIDATION_ERROR'])
  @ApiEnvelopeErrorResponse(429, ['TOO_MANY_REQUESTS'])
  async forgot(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.forgotPassword.execute(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'auth_resetPassword',
    summary: 'Restablecer la contraseña',
  })
  @ResponseMessage(
    'Contraseña actualizada correctamente. Inicia sesión de nuevo',
  )
  @ApiEnvelopeResponse(null, { status: 200 })
  @ApiEnvelopeErrorResponse(400, [
    'INVALID_OR_EXPIRED_TOKEN',
    'VALIDATION_ERROR',
  ])
  async reset(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPassword.execute(dto);
  }
}
