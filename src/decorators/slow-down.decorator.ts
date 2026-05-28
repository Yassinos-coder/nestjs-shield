import { SetMetadata } from '@nestjs/common';
import { META_SLOW_DOWN } from '../shield.constants';
import type { SlowDownConfig } from '../shield.types';

export const SlowDown = (config: SlowDownConfig) => SetMetadata(META_SLOW_DOWN, config);
