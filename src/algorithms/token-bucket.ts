import type { ShieldStorage, TokenBucketResult } from '../storage/shield-storage.interface';

export class TokenBucket {
  static async check(
    storage: ShieldStorage,
    key: string,
    limit: number,
    ttlMs: number,
  ): Promise<TokenBucketResult> {
    const refillPerMs = limit / ttlMs;
    return storage.consumeToken(key, limit, refillPerMs, 1);
  }
}
