import { DEFAULT_MEMORY_MAX_KEYS } from '../shield.constants';
import type {
  CounterResult,
  ShieldStorage,
  TokenBucketResult,
  WindowResult,
} from './shield-storage.interface';

interface Entry {
  value: string;
  expiresAt: number;
}

interface BucketEntry {
  tokens: number;
  last: number;
  expiresAt: number;
}

interface LogEntry {
  hits: number[];
  expiresAt: number;
}

export interface MemoryStorageOptions {
  maxKeys?: number;
}

export class MemoryStorage implements ShieldStorage {
  private readonly maxKeys: number;
  private readonly map = new Map<string, Entry>();
  private readonly buckets = new Map<string, BucketEntry>();
  private readonly logs = new Map<string, LogEntry>();
  private readonly counters = new Map<string, number>();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(opts: MemoryStorageOptions = {}) {
    this.maxKeys = opts.maxKeys ?? DEFAULT_MEMORY_MAX_KEYS;
    this.startSweeper();
  }

  async increment(key: string, ttlMs: number, by = 1): Promise<CounterResult> {
    const now = Date.now();
    const existing = this.map.get(key);
    if (!existing || existing.expiresAt <= now) {
      const entry: Entry = { value: String(by), expiresAt: now + ttlMs };
      this.set_(key, entry);
      return { count: by, expiresAt: entry.expiresAt };
    }
    const next = Number(existing.value) + by;
    existing.value = String(next);
    return { count: next, expiresAt: existing.expiresAt };
  }

  async consumeToken(
    key: string,
    capacity: number,
    refillPerMs: number,
    cost = 1,
  ): Promise<TokenBucketResult> {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      bucket = { tokens: capacity, last: now, expiresAt: now + this.ttlFromRefill(capacity, refillPerMs) };
      this.evictIfNeeded(this.buckets);
      this.buckets.set(key, bucket);
    }
    const elapsed = now - bucket.last;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
    bucket.last = now;
    bucket.expiresAt = now + this.ttlFromRefill(capacity, refillPerMs);

    const allowed = bucket.tokens >= cost;
    if (allowed) bucket.tokens -= cost;

    const deficit = Math.max(0, cost - bucket.tokens);
    const resetMs = refillPerMs > 0 ? Math.ceil(deficit / refillPerMs) : 0;
    return {
      allowed,
      remaining: Math.max(0, Math.floor(bucket.tokens)),
      resetMs,
      limit: capacity,
    };
  }

  async fixedWindow(key: string, ttlMs: number, limit: number): Promise<WindowResult> {
    const now = Date.now();
    const existing = this.map.get(key);
    let count: number;
    let expiresAt: number;
    if (!existing || existing.expiresAt <= now) {
      expiresAt = now + ttlMs;
      count = 1;
      this.set_(key, { value: '1', expiresAt });
    } else {
      count = Number(existing.value) + 1;
      existing.value = String(count);
      expiresAt = existing.expiresAt;
    }
    return { count, allowed: count <= limit, resetMs: Math.max(0, expiresAt - now), limit };
  }

  async slidingWindowCounter(
    key: string,
    ttlMs: number,
    limit: number,
  ): Promise<WindowResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / ttlMs) * ttlMs;
    const currentKey = `${key}:c:${windowStart}`;
    const prevKey = `${key}:c:${windowStart - ttlMs}`;
    const elapsedInWindow = now - windowStart;
    const weight = 1 - elapsedInWindow / ttlMs;

    const current = await this.increment(currentKey, ttlMs * 2);
    const prevRaw = this.map.get(prevKey);
    const prevCount = prevRaw && prevRaw.expiresAt > now ? Number(prevRaw.value) : 0;

    const weighted = prevCount * weight + current.count;
    const allowed = weighted <= limit;
    const resetMs = Math.max(0, ttlMs - elapsedInWindow);
    return { count: Math.ceil(weighted), allowed, resetMs, limit };
  }

  async slidingWindowLog(
    key: string,
    ttlMs: number,
    limit: number,
    now = Date.now(),
  ): Promise<WindowResult> {
    let log = this.logs.get(key);
    if (!log) {
      log = { hits: [], expiresAt: now + ttlMs };
      this.evictIfNeeded(this.logs);
      this.logs.set(key, log);
    }
    const threshold = now - ttlMs;
    log.hits = log.hits.filter((t) => t > threshold);
    const allowed = log.hits.length < limit;
    if (allowed) log.hits.push(now);
    log.expiresAt = now + ttlMs;
    const oldest = log.hits[0] ?? now;
    const resetMs = Math.max(0, oldest + ttlMs - now);
    return { count: log.hits.length, allowed, resetMs, limit };
  }

  async leakyBucket(
    key: string,
    capacity: number,
    leakPerMs: number,
  ): Promise<TokenBucketResult> {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      bucket = { tokens: 0, last: now, expiresAt: now + this.ttlFromRefill(capacity, leakPerMs) };
      this.evictIfNeeded(this.buckets);
      this.buckets.set(key, bucket);
    }
    const elapsed = now - bucket.last;
    bucket.tokens = Math.max(0, bucket.tokens - elapsed * leakPerMs);
    bucket.last = now;
    bucket.expiresAt = now + this.ttlFromRefill(capacity, leakPerMs);

    const allowed = bucket.tokens + 1 <= capacity;
    if (allowed) bucket.tokens += 1;

    const overflow = Math.max(0, bucket.tokens - capacity + 1);
    const resetMs = leakPerMs > 0 ? Math.ceil(overflow / leakPerMs) : 0;
    return {
      allowed,
      remaining: Math.max(0, capacity - Math.ceil(bucket.tokens)),
      resetMs,
      limit: capacity,
    };
  }

  async get(key: string): Promise<string | null> {
    const now = Date.now();
    const e = this.map.get(key);
    if (!e || e.expiresAt <= now) return null;
    return e.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.set_(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
    this.buckets.delete(key);
    this.logs.delete(key);
    this.counters.delete(key);
  }

  async incrementConcurrent(key: string): Promise<number> {
    const next = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, next);
    return next;
  }

  async decrementConcurrent(key: string): Promise<number> {
    const next = Math.max(0, (this.counters.get(key) ?? 0) - 1);
    if (next === 0) this.counters.delete(key);
    else this.counters.set(key, next);
    return next;
  }

  dispose(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.map.clear();
    this.buckets.clear();
    this.logs.clear();
    this.counters.clear();
  }

  private set_(key: string, entry: Entry): void {
    this.evictIfNeeded(this.map);
    this.map.set(key, entry);
  }

  private evictIfNeeded(target: Map<string, unknown>): void {
    if (target.size < this.maxKeys) return;
    const evictCount = Math.ceil(this.maxKeys * 0.1);
    let i = 0;
    for (const k of target.keys()) {
      if (i++ >= evictCount) break;
      target.delete(k);
    }
  }

  private ttlFromRefill(capacity: number, ratePerMs: number): number {
    if (ratePerMs <= 0) return 60_000;
    return Math.ceil(capacity / ratePerMs) * 2;
  }

  private startSweeper(): void {
    this.sweepTimer = setInterval(() => this.sweep(), 30_000);
    if (this.sweepTimer.unref) this.sweepTimer.unref();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [k, v] of this.map) if (v.expiresAt <= now) this.map.delete(k);
    for (const [k, v] of this.buckets) if (v.expiresAt <= now) this.buckets.delete(k);
    for (const [k, v] of this.logs) if (v.expiresAt <= now) this.logs.delete(k);
  }
}
