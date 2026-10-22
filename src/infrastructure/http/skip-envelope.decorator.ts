import { SetMetadata } from '@nestjs/common';

export const SKIP_ENVELOPE = Symbol('SKIP_ENVELOPE');

export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE, true);
