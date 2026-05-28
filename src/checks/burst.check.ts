import { KEY_BURST } from '../shield.constants';
import type { ShieldStorage } from '../storage/shield-storage.interface';
import type { BurstConfig, CheckOutcome } from '../shield.types';

export class BurstCheck {
  static async check(
    storage: ShieldStorage,
    ip: string,
    config?: BurstConfig,
  ): Promise<CheckOutcome> {
    if (!config) return { allowed: true };
    const key = `${KEY_BURST}:${ip}`;
    const current = await storage.incrementConcurrent(key);
    if (current > config.maxConcurrent) {
      await storage.decrementConcurrent(key);
      return {
        allowed: false,
        layer: 'burst',
        status: 429,
        reason: `Concurrent request limit ${config.maxConcurrent} exceeded`,
      };
    }
    return {
      allowed: true,
      release: async () => {
        await storage.decrementConcurrent(key);
      },
    };
  }
}
