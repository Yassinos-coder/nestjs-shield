import type {
  CounterResult,
  ShieldStorage,
  TokenBucketResult,
  WindowResult,
} from './shield-storage.interface';

type RedisLike = {
  call: (...args: unknown[]) => Promise<unknown>;
  eval: (...args: unknown[]) => Promise<unknown>;
  incr: (key: string) => Promise<number>;
  decr: (key: string) => Promise<number>;
  incrby: (key: string, by: number) => Promise<number>;
  pexpire: (key: string, ms: number) => Promise<number>;
  pttl: (key: string) => Promise<number>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: string, ttl: number) => Promise<string | null>;
  del: (key: string) => Promise<number>;
  defineCommand?: (
    name: string,
    def: { numberOfKeys: number; lua: string },
  ) => void;
  [k: string]: unknown;
};

const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillPerMs = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local ttlMs = tonumber(ARGV[5])

local data = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(data[1])
local last = tonumber(data[2])

if tokens == nil then
  tokens = capacity
  last = now
end

local elapsed = math.max(0, now - last)
tokens = math.min(capacity, tokens + elapsed * refillPerMs)

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'last', now)
redis.call('PEXPIRE', key, ttlMs)

local deficit = math.max(0, cost - tokens)
local resetMs = 0
if refillPerMs > 0 then
  resetMs = math.ceil(deficit / refillPerMs)
end

return { allowed, math.floor(tokens), resetMs }
`;

const LEAKY_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local leakPerMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttlMs = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'level', 'last')
local level = tonumber(data[1])
local last = tonumber(data[2])

if level == nil then
  level = 0
  last = now
end

local elapsed = math.max(0, now - last)
level = math.max(0, level - elapsed * leakPerMs)

local allowed = 0
if level + 1 <= capacity then
  level = level + 1
  allowed = 1
end

redis.call('HMSET', key, 'level', level, 'last', now)
redis.call('PEXPIRE', key, ttlMs)

local overflow = math.max(0, level - capacity + 1)
local resetMs = 0
if leakPerMs > 0 then
  resetMs = math.ceil(overflow / leakPerMs)
end

return { allowed, math.max(0, capacity - math.ceil(level)), resetMs }
`;

const SLIDING_LOG_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local ttlMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local threshold = now - ttlMs

redis.call('ZREMRANGEBYSCORE', key, '-inf', threshold)
local count = redis.call('ZCARD', key)
local allowed = 0
if count < limit then
  redis.call('ZADD', key, now, now .. ':' .. math.random())
  count = count + 1
  allowed = 1
end
redis.call('PEXPIRE', key, ttlMs)

local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local resetMs = 0
if oldest[2] then
  resetMs = math.max(0, tonumber(oldest[2]) + ttlMs - now)
end

return { allowed, count, resetMs }
`;

const INCREMENT_LUA = `
local key = KEYS[1]
local by = tonumber(ARGV[1])
local ttlMs = tonumber(ARGV[2])
local count = redis.call('INCRBY', key, by)
if count == by then
  redis.call('PEXPIRE', key, ttlMs)
end
local ttl = redis.call('PTTL', key)
if ttl < 0 then ttl = 0 end
return { count, ttl }
`;

const SLIDING_COUNTER_LUA = `
local cur = KEYS[1]
local prev = KEYS[2]
local ttlMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local weight = tonumber(ARGV[3])
local resetMs = tonumber(ARGV[4])

local prevCount = tonumber(redis.call('GET', prev) or '0')
local curCount = redis.call('INCR', cur)
redis.call('PEXPIRE', cur, ttlMs * 2)

local weighted = math.ceil(prevCount * weight + curCount)
local allowed = 0
if weighted <= limit then allowed = 1 end

return { allowed, weighted, resetMs }
`;

export interface RedisStorageOptions {
  client: RedisLike;
  keyPrefix?: string;
}

export class RedisStorage implements ShieldStorage {
  private readonly client: RedisLike;
  private readonly prefix: string;
  private commandsDefined = false;

  constructor(opts: RedisStorageOptions) {
    if (!opts || !opts.client) {
      throw new Error('RedisStorage requires an ioredis client');
    }
    this.client = opts.client;
    this.prefix = opts.keyPrefix ?? '';
    this.tryDefineCommands();
  }

  async increment(key: string, ttlMs: number, by = 1): Promise<CounterResult> {
    const k = this.k(key);
    const res = (await this.runScript('shieldIncrement', INCREMENT_LUA, [k], [by, ttlMs])) as [
      number,
      number,
    ];
    return {
      count: Number(res[0]),
      expiresAt: Date.now() + Math.max(0, Number(res[1])),
    };
  }

  async consumeToken(
    key: string,
    capacity: number,
    refillPerMs: number,
    cost = 1,
  ): Promise<TokenBucketResult> {
    const k = this.k(key);
    const ttlMs = this.ttlFor(capacity, refillPerMs);
    const res = (await this.runScript('shieldTokenBucket', TOKEN_BUCKET_LUA, [k], [
      capacity,
      refillPerMs,
      cost,
      Date.now(),
      ttlMs,
    ])) as [number, number, number];
    return {
      allowed: res[0] === 1,
      remaining: Math.max(0, Number(res[1])),
      resetMs: Number(res[2]),
      limit: capacity,
    };
  }

  async fixedWindow(key: string, ttlMs: number, limit: number): Promise<WindowResult> {
    const k = this.k(key);
    const count = await this.client.incr(k);
    if (count === 1) await this.client.pexpire(k, ttlMs);
    const ttl = await this.client.pttl(k);
    return { count, allowed: count <= limit, resetMs: Math.max(0, ttl), limit };
  }

  async slidingWindowCounter(
    key: string,
    ttlMs: number,
    limit: number,
  ): Promise<WindowResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / ttlMs) * ttlMs;
    const cur = this.k(`${key}:c:${windowStart}`);
    const prev = this.k(`${key}:c:${windowStart - ttlMs}`);
    const elapsedInWindow = now - windowStart;
    const weight = 1 - elapsedInWindow / ttlMs;
    const resetMs = Math.max(0, ttlMs - elapsedInWindow);

    const res = (await this.runScript(
      'shieldSlidingCounter',
      SLIDING_COUNTER_LUA,
      [cur, prev],
      [ttlMs, limit, weight, resetMs],
    )) as [number, number, number];
    return {
      allowed: res[0] === 1,
      count: Number(res[1]),
      resetMs: Number(res[2]),
      limit,
    };
  }

  async slidingWindowLog(
    key: string,
    ttlMs: number,
    limit: number,
    now = Date.now(),
  ): Promise<WindowResult> {
    const k = this.k(key);
    const res = (await this.runScript(
      'shieldSlidingLog',
      SLIDING_LOG_LUA,
      [k],
      [now, ttlMs, limit],
    )) as [number, number, number];
    return {
      allowed: res[0] === 1,
      count: Number(res[1]),
      resetMs: Number(res[2]),
      limit,
    };
  }

  async leakyBucket(
    key: string,
    capacity: number,
    leakPerMs: number,
  ): Promise<TokenBucketResult> {
    const k = this.k(key);
    const ttlMs = this.ttlFor(capacity, leakPerMs);
    const res = (await this.runScript('shieldLeakyBucket', LEAKY_BUCKET_LUA, [k], [
      capacity,
      leakPerMs,
      Date.now(),
      ttlMs,
    ])) as [number, number, number];
    return {
      allowed: res[0] === 1,
      remaining: Math.max(0, Number(res[1])),
      resetMs: Number(res[2]),
      limit: capacity,
    };
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(this.k(key));
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.client.set(this.k(key), value, 'PX', ttlMs);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.k(key));
  }

  async incrementConcurrent(key: string): Promise<number> {
    const k = this.k(`burst:${key}`);
    const next = await this.client.incr(k);
    await this.client.pexpire(k, 60_000);
    return next;
  }

  async decrementConcurrent(key: string): Promise<number> {
    const k = this.k(`burst:${key}`);
    const next = await this.client.decr(k);
    if (next <= 0) await this.client.del(k);
    return Math.max(0, next);
  }

  private k(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  private ttlFor(capacity: number, ratePerMs: number): number {
    if (ratePerMs <= 0) return 60_000;
    return Math.ceil(capacity / ratePerMs) * 2;
  }

  private tryDefineCommands(): void {
    if (this.commandsDefined) return;
    if (typeof this.client.defineCommand !== 'function') return;
    try {
      this.client.defineCommand('shieldTokenBucket', { numberOfKeys: 1, lua: TOKEN_BUCKET_LUA });
      this.client.defineCommand('shieldLeakyBucket', { numberOfKeys: 1, lua: LEAKY_BUCKET_LUA });
      this.client.defineCommand('shieldSlidingLog', { numberOfKeys: 1, lua: SLIDING_LOG_LUA });
      this.client.defineCommand('shieldSlidingCounter', { numberOfKeys: 2, lua: SLIDING_COUNTER_LUA });
      this.client.defineCommand('shieldIncrement', { numberOfKeys: 1, lua: INCREMENT_LUA });
      this.commandsDefined = true;
    } catch {
      this.commandsDefined = false;
    }
  }

  private async runScript(
    name: string,
    lua: string,
    keys: string[],
    args: (string | number)[],
  ): Promise<unknown> {
    const fn = (this.client as Record<string, unknown>)[name];
    if (this.commandsDefined && typeof fn === 'function') {
      return (fn as (...a: unknown[]) => Promise<unknown>).call(
        this.client,
        ...keys,
        ...args,
      );
    }
    return this.client.eval(lua, keys.length, ...keys, ...args);
  }
}
