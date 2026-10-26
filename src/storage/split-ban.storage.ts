import { KEY_BAN, KEY_BAN_COUNT } from '../shield.constants';
import type {
  CounterResult,
  ShieldStorage,
  TokenBucketResult,
  WindowResult,
} from './shield-storage.interface';

export class SplitBanStorage implements ShieldStorage {
  constructor(
    private readonly main: ShieldStorage,
    private readonly bans: ShieldStorage,
  ) {}

  increment(key: string, ttlMs: number, by?: number): Promise<CounterResult> {
    return this.storageFor(key).increment(key, ttlMs, by);
  }

  consumeToken(key: string, capacity: number, refillPerMs: number, cost?: number): Promise<TokenBucketResult> {
    return this.main.consumeToken(key, capacity, refillPerMs, cost);
  }

  fixedWindow(key: string, ttlMs: number, limit: number): Promise<WindowResult> {
    return this.main.fixedWindow(key, ttlMs, limit);
  }

  slidingWindowCounter(key: string, ttlMs: number, limit: number): Promise<WindowResult> {
    return this.main.slidingWindowCounter(key, ttlMs, limit);
  }

  slidingWindowLog(key: string, ttlMs: number, limit: number, now?: number): Promise<WindowResult> {
    return this.main.slidingWindowLog(key, ttlMs, limit, now);
  }

  leakyBucket(key: string, capacity: number, leakPerMs: number): Promise<TokenBucketResult> {
    return this.main.leakyBucket(key, capacity, leakPerMs);
  }

  get(key: string): Promise<string | null> {
    return this.storageFor(key).get(key);
  }

  set(key: string, value: string, ttlMs: number): Promise<void> {
    return this.storageFor(key).set(key, value, ttlMs);
  }

  delete(key: string): Promise<void> {
    return this.storageFor(key).delete(key);
  }

  async scan(prefix: string, limit: number): Promise<string[]> {
    const storage = this.storageFor(prefix);
    return storage.scan ? storage.scan(prefix, limit) : [];
  }

  incrementConcurrent(key: string): Promise<number> {
    return this.main.incrementConcurrent(key);
  }

  decrementConcurrent(key: string): Promise<number> {
    return this.main.decrementConcurrent(key);
  }

  async dispose(): Promise<void> {
    await this.main.dispose?.();
    await this.bans.dispose?.();
  }

  private storageFor(key: string): ShieldStorage {
    const banKey = key.startsWith(`${KEY_BAN}:`) || key.startsWith(`${KEY_BAN_COUNT}:`);
    return banKey ? this.bans : this.main;
  }
}
