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
  algorithm?: RateLimitAlgorithm;
  limit: number;
  ttl: number;
  keyBy?: KeyByOption;
  skip?: (req: AnyRequest) => boolean;
  headers?: boolean;
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
  threshold: number;
  window: number;
  banDuration: number;
  escalate?: boolean;
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

export type StorageOption =
  | ShieldStorage
  | 'memory'
  | { type: 'memory'; maxKeys?: number }
  | { type: 'redis'; client: unknown; keyPrefix?: string };

export interface ShieldConfig {
  enabled?: boolean;
  trustProxy?: boolean | number;
  ipResolver?: (req: AnyRequest) => string;
  storage?: StorageOption;
  rateLimit?: RateLimitConfig;
  whitelist?: IpListConfig;
  blacklist?: BlacklistConfig;
  autoBan?: AutoBanConfig;
  slowDown?: SlowDownConfig;
  userAgent?: UserAgentConfig;
  burst?: BurstConfig;
  payload?: PayloadConfig;
  response?: ResponseConfig;
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
