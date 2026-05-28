import { SetMetadata } from '@nestjs/common';
import { META_WHITELIST } from '../shield.constants';
import type { IpListConfig } from '../shield.types';

export const Whitelist = (config: IpListConfig) => SetMetadata(META_WHITELIST, config);
