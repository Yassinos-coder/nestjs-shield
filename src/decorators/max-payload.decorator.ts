import { SetMetadata } from '@nestjs/common';
import { META_MAX_PAYLOAD } from '../shield.constants';
import type { PayloadConfig } from '../shield.types';

export const MaxPayload = (config: PayloadConfig) => SetMetadata(META_MAX_PAYLOAD, config);
