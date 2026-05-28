import { SetMetadata } from '@nestjs/common';
import { META_SKIP } from '../shield.constants';
import type { ShieldLayer } from '../shield.constants';

export const SkipShield = (...layers: ShieldLayer[]) =>
  SetMetadata(META_SKIP, layers.length === 0 ? true : layers);
