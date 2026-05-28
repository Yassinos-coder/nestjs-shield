import type { ShieldStorage, WindowResult } from '../storage/shield-storage.interface';

export class SlidingWindowCounter {
  static async check(
    storage: ShieldStorage,
    key: string,
    limit: number,
    ttlMs: number,
  ): Promise<WindowResult> {
    return storage.slidingWindowCounter(key, ttlMs, limit);
  }
}
