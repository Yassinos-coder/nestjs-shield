export { ShieldModule } from './shield.module';
export type { ShieldAsyncOptions } from './shield.module';
export { ShieldEngine } from './shield.engine';
export { ShieldGuard } from './shield.guard';
export { Shield } from './apply-to';
export type { NestAppLike } from './apply-to';

export {
  SHIELD_CONFIG,
  SHIELD_ENGINE,
  SHIELD_STORAGE,
  ALL_LAYERS,
} from './shield.constants';
export type { ShieldLayer } from './shield.constants';

export type {
  ShieldConfig,
  RateLimitConfig,
  RateLimitAlgorithm,
  KeyByOption,
  IpListConfig,
  BlacklistConfig,
  AutoBanConfig,
  SlowDownConfig,
  UserAgentConfig,
  BurstConfig,
  PayloadConfig,
  ResponseConfig,
  StorageOption,
  RejectInfo,
  DecoratorOverrides,
  AnyRequest,
  AnyResponse,
  CheckOutcome,
} from './shield.types';

export { RateLimit } from './decorators/rate-limit.decorator';
export { SkipShield } from './decorators/skip-shield.decorator';
export { Blacklist } from './decorators/blacklist.decorator';
export { Whitelist } from './decorators/whitelist.decorator';
export { SlowDown } from './decorators/slow-down.decorator';
export { MaxPayload } from './decorators/max-payload.decorator';
export { BurstLimit } from './decorators/burst-limit.decorator';
export { UserAgentPolicy } from './decorators/user-agent-policy.decorator';

export { MemoryStorage } from './storage/memory.storage';
export type { MemoryStorageOptions } from './storage/memory.storage';
export { RedisStorage } from './storage/redis.storage';
export type { RedisStorageOptions } from './storage/redis.storage';
export type {
  ShieldStorage,
  CounterResult,
  TokenBucketResult,
  WindowResult,
} from './storage/shield-storage.interface';

export { TokenBucket } from './algorithms/token-bucket';
export { SlidingWindowCounter } from './algorithms/sliding-window-counter';
export { SlidingWindowLog } from './algorithms/sliding-window-log';
export { FixedWindow } from './algorithms/fixed-window';
export { LeakyBucket } from './algorithms/leaky-bucket';

export {
  ShieldRateLimitException,
  ShieldBlockedException,
  ShieldPayloadException,
} from './exceptions/shield.exceptions';

export { IpUtil } from './utils/ip.util';
export { HeadersUtil } from './utils/headers.util';
export { UaUtil } from './utils/ua.util';
export { KeyUtil } from './utils/key.util';
