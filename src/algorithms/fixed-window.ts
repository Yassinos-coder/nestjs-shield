import type { ShieldStorage, WindowResult } from '../storage/shield-storage.interface';

export class FixedWindow {
  static async check(
    storage: ShieldStorage,
    key: string,
    limit: number,
    ttlMs: number,
  ): Promise<WindowResult> {
    return storage.fixedWindow(key, ttlMs, limit);
  }
}
