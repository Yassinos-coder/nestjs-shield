import { KEY_SLOW_DOWN } from '../shield.constants';
import type { ShieldStorage } from '../storage/shield-storage.interface';
import type { CheckOutcome, SlowDownConfig } from '../shield.types';

export class SlowDownCheck {
  static async check(
    storage: ShieldStorage,
    ip: string,
    ttlMs: number,
    config?: SlowDownConfig,
  ): Promise<CheckOutcome> {
    if (!config) return { allowed: true };
    const key = `${KEY_SLOW_DOWN}:${ip}`;
    const { count } = await storage.increment(key, ttlMs);

    if (count <= config.delayAfter) return { allowed: true };

    const overflow = count - config.delayAfter;
    const computed =
      typeof config.delayMs === 'function' ? config.delayMs(overflow) : config.delayMs * overflow;
    const delay = config.maxDelayMs ? Math.min(config.maxDelayMs, computed) : computed;

    return { allowed: true, layer: 'slow-down', delayMs: Math.max(0, delay) };
  }
}
