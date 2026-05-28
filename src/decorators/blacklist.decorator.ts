import { SetMetadata } from '@nestjs/common';
import { META_BLACKLIST } from '../shield.constants';
import type { IpListConfig } from '../shield.types';

export const Blacklist = (config: IpListConfig) => SetMetadata(META_BLACKLIST, config);
