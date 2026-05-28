export interface CounterResult {
  count: number;
  expiresAt: number;
}

export interface TokenBucketResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  limit: number;
}

export interface WindowResult {
  count: number;
  allowed: boolean;
  resetMs: number;
  limit: number;
}

export interface ShieldStorage {
  increment(key: string, ttlMs: number, by?: number): Promise<CounterResult>;

  consumeToken(
    key: string,
    capacity: number,
    refillPerMs: number,
    cost?: number,
  ): Promise<TokenBucketResult>;

  fixedWindow(key: string, ttlMs: number, limit: number): Promise<WindowResult>;

  slidingWindowCounter(
    key: string,
    ttlMs: number,
    limit: number,
  ): Promise<WindowResult>;

  slidingWindowLog(
    key: string,
    ttlMs: number,
    limit: number,
    now?: number,
  ): Promise<WindowResult>;

  leakyBucket(
    key: string,
    capacity: number,
    leakPerMs: number,
  ): Promise<TokenBucketResult>;

  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;

  incrementConcurrent(key: string): Promise<number>;
  decrementConcurrent(key: string): Promise<number>;

  dispose?(): Promise<void> | void;
}
