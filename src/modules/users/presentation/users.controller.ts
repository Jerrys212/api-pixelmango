import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeErrorResponse,
  ApiEnvelopeResponse,
  ResponseMessage,
} from '../../../infrastructure/http/index.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../../infrastructure/http/auth/index.js';
import { GetUserProfileUseCase } from '../application/get-user-profile.use-case.js';
import { UserProfileResponseDto } from './dto/user-profile.response.dto.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly getUserProfile: GetUserProfileUseCase) {}

  @Get('me')
  @ApiOperation({
    operationId: 'users_getMe',
    summary: 'Perfil del usuario autenticado',
  })
  @ResponseMessage('Perfil obtenido correctamente')
  @ApiEnvelopeResponse(UserProfileResponseDto, { status: 200 })
  @ApiEnvelopeErrorResponse(401, ['UNAUTHORIZED'])
  @ApiEnvelopeErrorResponse(404, ['USER_NOT_FOUND'])
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfileResponseDto> {
    const account = await this.getUserProfile.execute({ userId: user.id });
    return UserProfileResponseDto.from(account);
  }
}
