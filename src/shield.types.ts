import type { AdminOptions } from './admin/interfaces';
import type { ShieldLayer } from './shield.constants';
import type { ShieldStorage } from './storage/shield-storage.interface';

export type RateLimitAlgorithm =
  | 'token-bucket'
  | 'sliding-window'
  | 'sliding-window-log'
  | 'fixed-window'
  | 'leaky-bucket';

export type KeyByOption = 'ip' | { header: string } | ((req: AnyRequest) => string);

export interface RateLimitConfig {
  /** Counting strategy. Defaults to `token-bucket`. */
  algorithm?: RateLimitAlgorithm;
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  ttl: number;
  /** What to count by. Defaults to the client IP; use a header or function for per-API-key limits. */
  keyBy?: KeyByOption;
  /** Return true to exempt a request from the rate limit only. */
  skip?: (req: AnyRequest) => boolean;
  /** Send `RateLimit-*` response headers. Defaults to true. */
  headers?: boolean;
  /** Header style: `draft-7` (default) or the older `X-RateLimit-*` `draft-6`. */
  standardHeaders?: 'draft-6' | 'draft-7';
}

export interface IpListConfig {
  ips?: string[];
  cidrs?: string[];
}

export interface BlacklistConfig extends IpListConfig {
  statusCode?: number;
}

export interface AutoBanConfig {
  /** Rejected requests (429/403) inside `window` that trigger a ban. */
  threshold: number;
  /** Counting window in milliseconds. */
  window: number;
  /** First ban length in milliseconds. */
  banDuration: number;
  /** Double the ban length on every repeat offence. Defaults to true. */
  escalate?: boolean;
  /** Upper limit for escalated bans, in milliseconds. */
  maxBanDuration?: number;
}

export interface SlowDownConfig {
  delayAfter: number;
  delayMs: number | ((hit: number) => number);
  maxDelayMs?: number;
}

export interface UserAgentConfig {
  block?: (string | RegExp)[];
  allow?: (string | RegExp)[];
  requirePresent?: boolean;
}

export interface BurstConfig {
  maxConcurrent: number;
}

export interface PayloadConfig {
  maxBodyBytes?: number;
  maxHeaderBytes?: number;
}

export interface RejectInfo {
  layer: ShieldLayer;
  ip: string;
  reason: string;
  status: number;
  retryAfterMs?: number;
}

export interface ResponseConfig {
  rateLimit429?: {
    message?: string;
    code?: string;
    includeRetryAfter?: boolean;
  };
  blocked403?: {
    message?: string;
    code?: string;
  };
  payload413?: {
    message?: string;
    code?: string;
  };
  onReject?: (req: AnyRequest, res: AnyResponse, info: RejectInfo) => void;
}

export interface RedisStorageOption {
  type: 'redis';
  /** Connection string. The library creates and closes the ioredis client for you. */
  url?: string;
  /** Or pass your own ioredis client (any version). `url` is ignored when this is set. */
  client?: unknown;
  keyPrefix?: string;
  /**
   * When Redis is unreachable, keep serving requests from in-memory counters instead of failing them.
   * Defaults to true.
   */
  failOpen?: boolean;
}

export type StorageOption =
  | ShieldStorage
  | 'memory'
  | { type: 'memory'; maxKeys?: number }
  | RedisStorageOption;

export type TrustProxyOption = boolean | number | 'cloudflare';

export interface ProbeConfig {
  /** Paths that count as a scanner probe. Defaults to a list of common ones (`/.env`, `/wp-login.php`, ...). */
  paths?: (string | RegExp)[];
}

export interface RulesSnapshot {
  whitelist?: IpListConfig;
  blacklist?: IpListConfig;
}

export interface RulesConfig {
  /** Loads address rules from your database or API. Merged on top of the static `whitelist` and `blacklist`. */
  load: () => Promise<RulesSnapshot> | RulesSnapshot;
  /** How often to reload, in milliseconds. Defaults to 30 000. */
  refreshMs?: number;
}

export type ShieldEvent =
  | { type: 'reject'; at: number; ip: string; layer: ShieldLayer; reason: string; status: number; method: string; path: string }
  | { type: 'ban'; at: number; ip: string; durationMs: number; source: 'auto' | 'manual' | 'probe' }
  | { type: 'unban'; at: number; ip: string };

export interface ShieldConfig {
  /** Master switch. Defaults to true. */
  enabled?: boolean;
  /**
   * How to find the real client IP.
   * `false` (default): the socket address. `true`: first `X-Forwarded-For` entry. A number: trust that many proxies.
   * `'cloudflare'`: the `CF-Connecting-IP` header, then `X-Forwarded-For`, then the socket (Cloudflare, Railway, Render).
   * Set this whenever your app sits behind a proxy, or every visitor will share one rate limit.
   */
  trustProxy?: TrustProxyOption;
  /** Read the client IP from this header instead (for example `fly-client-ip`). Falls back to `trustProxy`. */
  ipHeader?: string;
  /** Full control: your own IP extraction. Overrides `trustProxy` and `ipHeader`. */
  ipResolver?: (req: AnyRequest) => string;
  /** Where counters live. `'memory'` (default) or Redis for multiple instances. */
  storage?: StorageOption;
  /** Keep bans in a different store than counters, for example one Redis shared by several apps. */
  banStorage?: StorageOption;
  /** Requests per window. */
  rateLimit?: RateLimitConfig;
  /** These addresses skip every check. */
  whitelist?: IpListConfig;
  /** These addresses always get a 403. */
  blacklist?: BlacklistConfig;
  /** Temporarily ban addresses that keep getting rejected. */
  autoBan?: AutoBanConfig;
  /** Delay requests that approach the rate limit. */
  slowDown?: SlowDownConfig;
  /** Block or require user agents. */
  userAgent?: UserAgentConfig;
  /** Cap concurrent in-flight requests per IP. */
  burst?: BurstConfig;
  /** Cap request body and header size. */
  payload?: PayloadConfig;
  /**
   * Paths the shield ignores completely. A string matches that exact path, or a prefix when it ends with `*`.
   * Defaults to common health checks (`/health`, `/healthz`, `/livez`, `/readyz`, `/api/health`). Use `[]` to disable.
   */
  skipPaths?: (string | RegExp)[];
  /**
   * Count requests to scanner paths (`/.env`, `/wp-login.php`, ...) as violations, even though no route matches them,
   * so they feed auto-ban. `true` uses the default list. Needs `autoBan`.
   */
  probes?: boolean | ProbeConfig;
  /** Load whitelist and blacklist from your own database or API and keep them fresh. */
  rules?: RulesConfig;
  /** Custom error messages and the reject hook. */
  response?: ResponseConfig;
  /** Called for every reject and ban. Wrapped in try/catch, so it can never break a request. Use it for audit logs and metrics. */
  onEvent?: (event: ShieldEvent) => void;
  /** Admin dashboard tuning. The dashboard itself is switched on with `SHIELD_DASH=true`. */
  admin?: AdminOptions;
}

export type AnyRequest = {
  ip?: string;
  ips?: string[];
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  connection?: { remoteAddress?: string };
  method?: string;
  url?: string;
  body?: unknown;
  [key: string]: unknown;
};

export type AnyResponse = {
  statusCode?: number;
  setHeader: (name: string, value: string | number) => void;
  status?: (code: number) => AnyResponse;
  json?: (body: unknown) => AnyResponse;
  end?: (body?: unknown) => AnyResponse;
  on?: (event: string, cb: () => void) => void;
  [key: string]: unknown;
};

export interface DecoratorOverrides {
  skip?: true | ShieldLayer[];
  rateLimit?: Partial<RateLimitConfig> & { limit: number; ttl: number };
  blacklist?: IpListConfig;
  whitelist?: IpListConfig;
  slowDown?: SlowDownConfig;
  maxPayload?: PayloadConfig;
  burst?: BurstConfig;
  userAgent?: UserAgentConfig;
}

export interface CheckOutcome {
  allowed: boolean;
  layer?: ShieldLayer;
  status?: number;
  reason?: string;
  retryAfterMs?: number;
  headers?: Record<string, string | number>;
  delayMs?: number;
  release?: () => Promise<void> | void;
}

export interface ResolvedConfig extends Omit<ShieldConfig, 'rateLimit'> {
  rateLimit?: RateLimitConfig;
}

export interface ShieldBan {
  ip: string;
  expiresAt: number;
}

export interface ShieldBanList {
  /** False when the storage cannot list keys (custom storages without `scan`). */
  supported: boolean;
  bans: ShieldBan[];
}
