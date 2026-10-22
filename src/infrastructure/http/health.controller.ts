import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './auth/index.js';
import { SkipEnvelope } from './skip-envelope.decorator.js';

@ApiExcludeController()
@Public()
@SkipEnvelope()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
