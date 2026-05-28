import type { ShieldStorage, WindowResult } from '../storage/shield-storage.interface';

export class SlidingWindowLog {
  static async check(
    storage: ShieldStorage,
    key: string,
    limit: number,
    ttlMs: number,
  ): Promise<WindowResult> {
    return storage.slidingWindowLog(key, ttlMs, limit);
  }
}
