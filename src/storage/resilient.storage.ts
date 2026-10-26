import { Logger } from '@nestjs/common';
import { MemoryStorage } from './memory.storage';
import type {
  CounterResult,
  ShieldStorage,
  TokenBucketResult,
  WindowResult,
} from './shield-storage.interface';

const WARN_EVERY_MS = 30_000;

export interface ResilientStorageOptions {
  failOpen: boolean;
  onDispose?: () => Promise<void>;
}

export class ResilientStorage implements ShieldStorage {
  private readonly logger = new Logger('ShieldStorage');
  private readonly fallback = new MemoryStorage();
  private lastWarning = 0;

  constructor(
    private readonly primary: ShieldStorage,
    private readonly options: ResilientStorageOptions,
  ) {}

  increment(key: string, ttlMs: number, by?: number): Promise<CounterResult> {
    return this.guard((s) => s.increment(key, ttlMs, by));
  }

  consumeToken(key: string, capacity: number, refillPerMs: number, cost?: number): Promise<TokenBucketResult> {
    return this.guard((s) => s.consumeToken(key, capacity, refillPerMs, cost));
  }

  fixedWindow(key: string, ttlMs: number, limit: number): Promise<WindowResult> {
    return this.guard((s) => s.fixedWindow(key, ttlMs, limit));
  }

  slidingWindowCounter(key: string, ttlMs: number, limit: number): Promise<WindowResult> {
    return this.guard((s) => s.slidingWindowCounter(key, ttlMs, limit));
  }

  slidingWindowLog(key: string, ttlMs: number, limit: number, now?: number): Promise<WindowResult> {
    return this.guard((s) => s.slidingWindowLog(key, ttlMs, limit, now));
  }

  leakyBucket(key: string, capacity: number, leakPerMs: number): Promise<TokenBucketResult> {
    return this.guard((s) => s.leakyBucket(key, capacity, leakPerMs));
  }

  get(key: string): Promise<string | null> {
    return this.guard((s) => s.get(key));
  }

  set(key: string, value: string, ttlMs: number): Promise<void> {
    return this.guard((s) => s.set(key, value, ttlMs));
  }

  delete(key: string): Promise<void> {
    return this.guard((s) => s.delete(key));
  }

  scan(prefix: string, limit: number): Promise<string[]> {
    return this.guard((s) => (s.scan ? s.scan(prefix, limit) : Promise.resolve([])));
  }

  incrementConcurrent(key: string): Promise<number> {
    return this.guard((s) => s.incrementConcurrent(key));
  }

  decrementConcurrent(key: string): Promise<number> {
    return this.guard((s) => s.decrementConcurrent(key));
  }

  async dispose(): Promise<void> {
    await this.primary.dispose?.();
    await this.fallback.dispose?.();
    await this.options.onDispose?.();
  }

  private async guard<T>(run: (storage: ShieldStorage) => Promise<T>): Promise<T> {
    try {
      return await run(this.primary);
    } catch (error) {
      if (!this.options.failOpen) throw error;
      this.warn(error);
      return run(this.fallback);
    }
  }

  private warn(error: unknown): void {
    const now = Date.now();
    if (now - this.lastWarning < WARN_EVERY_MS) return;
    this.lastWarning = now;
    this.logger.warn(
      `Storage unreachable (${error instanceof Error ? error.message : String(error)}); using in-memory counters until it recovers`,
    );
  }
}
