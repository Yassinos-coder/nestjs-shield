import { SetMetadata } from '@nestjs/common';
import { META_BURST } from '../shield.constants';
import type { BurstConfig } from '../shield.types';

export const BurstLimit = (config: BurstConfig) => SetMetadata(META_BURST, config);
