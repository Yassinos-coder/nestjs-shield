import type { ShieldStorage, TokenBucketResult } from '../storage/shield-storage.interface';

export class LeakyBucket {
  static async check(
    storage: ShieldStorage,
    key: string,
    limit: number,
    ttlMs: number,
  ): Promise<TokenBucketResult> {
    const leakPerMs = limit / ttlMs;
    return storage.leakyBucket(key, limit, leakPerMs);
  }
}
