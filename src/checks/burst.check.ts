import { Logger } from '@nestjs/common';
import {
  BURST_LEASE_REFRESH_MS,
  BURST_LEASE_TTL_MS,
  KEY_BURST,
} from '../shield.constants';
import type { ShieldStorage } from '../storage/shield-storage.interface';
import type { BurstConfig, CheckOutcome } from '../shield.types';

export class BurstCheck {
  private static readonly logger = new Logger('ShieldBurst');
  private static lastRefreshWarning = 0;

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
    let released = false;
    const timer =
      typeof storage.refreshConcurrent === 'function'
        ? setInterval(() => {
            void BurstCheck.refresh(storage, key);
          }, BURST_LEASE_REFRESH_MS)
        : undefined;
    timer?.unref();
    return {
      allowed: true,
      release: async () => {
        if (released) return;
        released = true;
        if (timer) clearInterval(timer);
        await storage.decrementConcurrent(key);
      },
    };
  }

  private static async refresh(storage: ShieldStorage, key: string): Promise<void> {
    try {
      await storage.refreshConcurrent?.(key, BURST_LEASE_TTL_MS);
    } catch (error) {
      const now = Date.now();
      if (now - BurstCheck.lastRefreshWarning < BURST_LEASE_REFRESH_MS) return;
      BurstCheck.lastRefreshWarning = now;
      BurstCheck.logger.warn(
        `Could not refresh burst lease: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
