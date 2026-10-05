import type {
  AnyRequest,
  AnyResponse,
  AutoBanConfig,
  IpListConfig,
  RateLimitAlgorithm,
  ShieldConfig,
} from '../../shield.types';

export interface AdminOptions {
  attackModeFactor?: number;
  maxEvents?: number;
}

export interface AdminRateLimitOverride {
  limit: number;
  ttl: number;
  algorithm?: RateLimitAlgorithm;
}

export interface AdminOverrides {
  enabled?: boolean;
  attackMode?: boolean;
  rateLimit?: AdminRateLimitOverride | null;
  whitelist?: IpListConfig;
  blacklist?: IpListConfig;
  autoBan?: AutoBanConfig | null;
}

export interface AdminDecision {
  allowed: boolean;
  ip: string;
  layer?: string;
  reason?: string;
  status?: number;
}

export interface AdminEvent {
  id: number;
  at: number;
  ip: string;
  method: string;
  path: string;
  userAgent: string;
  allowed: boolean;
  layer?: string;
  reason?: string;
  status?: number;
  durationMs?: number;
}

export interface AdminMinuteBucket {
  minute: number;
  total: number;
  rejected: number;
}

export interface AdminStats {
  total: number;
  allowed: number;
  rejected: number;
  byLayer: Record<string, number>;
  byStatusClass: Record<string, number>;
  minutes: AdminMinuteBucket[];
}

export interface AdminBan {
  ip: string;
  expiresAt: number;
}

export interface AdminBanList {
  supported: boolean;
  bans: AdminBan[];
}

export interface AdminSettings {
  rateLimit: AdminRateLimitOverride | null;
  whitelist: IpListConfig;
  blacklist: IpListConfig;
  autoBan: AutoBanConfig | null;
}

export interface AdminSnapshot {
  version: string;
  uptimeSec: number;
  storage: string;
  enabled: boolean;
  attackMode: boolean;
  attackModeFactor: number;
  settings: AdminSettings;
  effective: { rateLimit: { limit: number; ttl: number } | null };
  stats: AdminStats;
}

export interface AdminCredentials {
  user: string;
  password: string;
}

export interface LoginAttempt {
  count: number;
  resetAt: number;
}

export interface BanInput {
  ip: string;
  minutes: number;
}

export type AdminPageState = 'disabled' | 'misconfigured' | 'login' | 'dashboard';

export interface ShieldRuntime {
  isActive(): boolean;
  effectiveConfig(base: ShieldConfig): ShieldConfig;
  record(req: AnyRequest, res: AnyResponse, decision: AdminDecision): void;
}
