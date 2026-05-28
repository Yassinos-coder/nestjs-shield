import { SetMetadata } from '@nestjs/common';
import { META_RATE_LIMIT } from '../shield.constants';
import type { RateLimitConfig } from '../shield.types';

export const RateLimit = (options: RateLimitConfig) => SetMetadata(META_RATE_LIMIT, options);
