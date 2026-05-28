import { SetMetadata } from '@nestjs/common';
import { META_UA } from '../shield.constants';
import type { UserAgentConfig } from '../shield.types';

export const UserAgentPolicy = (config: UserAgentConfig) => SetMetadata(META_UA, config);
