import { FixedWindow } from '../algorithms/fixed-window';
import { LeakyBucket } from '../algorithms/leaky-bucket';
import { SlidingWindowCounter } from '../algorithms/sliding-window-counter';
import { SlidingWindowLog } from '../algorithms/sliding-window-log';
import { TokenBucket } from '../algorithms/token-bucket';
import { KEY_RATE_LIMIT } from '../shield.constants';
import type { ShieldStorage } from '../storage/shield-storage.interface';
import type {
  AnyRequest,
  CheckOutcome,
  RateLimitConfig,
} from '../shield.types';
import { KeyUtil } from '../utils/key.util';

export class RateLimitCheck {
  static async check(
    storage: ShieldStorage,
    req: AnyRequest,
    ip: string,
    config: RateLimitConfig,
  ): Promise<CheckOutcome & { limit: number; remaining: number; resetMs: number }> {
    if (config.skip && config.skip(req)) {
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        resetMs: 0,
      };
    }

    const tracker = KeyUtil.fromRequest(req, ip, config.keyBy);
    const algo = config.algorithm ?? 'token-bucket';
    const key = `${KEY_RATE_LIMIT}:${algo}:${tracker}`;

    let result: { allowed: boolean; remaining?: number; count?: number; resetMs: number; limit: number };
    switch (algo) {
      case 'token-bucket':
        result = await TokenBucket.check(storage, key, config.limit, config.ttl);
        break;
      case 'sliding-window':
        result = await SlidingWindowCounter.check(storage, key, config.limit, config.ttl);
        break;
      case 'sliding-window-log':
        result = await SlidingWindowLog.check(storage, key, config.limit, config.ttl);
        break;
      case 'fixed-window':
        result = await FixedWindow.check(storage, key, config.limit, config.ttl);
        break;
      case 'leaky-bucket':
        result = await LeakyBucket.check(storage, key, config.limit, config.ttl);
        break;
      default:
        result = await TokenBucket.check(storage, key, config.limit, config.ttl);
    }

    const remaining =
      'remaining' in result && result.remaining !== undefined
        ? result.remaining
        : Math.max(0, config.limit - (result.count ?? 0));

    return {
      allowed: result.allowed,
      layer: 'rate-limit',
      status: result.allowed ? undefined : 429,
      reason: result.allowed ? undefined : 'Rate limit exceeded',
      retryAfterMs: result.allowed ? undefined : result.resetMs,
      limit: config.limit,
      remaining,
      resetMs: result.resetMs,
    };
  }
}
