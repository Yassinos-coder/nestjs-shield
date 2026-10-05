import type { AutoBanConfig, RateLimitConfig, ShieldConfig, UserAgentConfig } from '../../shield.types';
import {
  ATTACK_BOT_PATTERN,
  ATTACK_FALLBACK_AUTO_BAN,
  ATTACK_FALLBACK_RATE_LIMIT,
} from '../constants/admin.constants';
import type { AdminOverrides, AdminSettings } from '../interfaces';

export class AdminConfigMapper {
  static toEffective(base: ShieldConfig, overrides: AdminOverrides, factor: number): ShieldConfig {
    const attack = overrides.attackMode === true;
    const rateLimit = AdminConfigMapper.resolveRateLimit(base, overrides);
    const autoBan = AdminConfigMapper.resolveAutoBan(base, overrides);

    return {
      ...base,
      enabled: overrides.enabled ?? base.enabled,
      rateLimit: attack ? AdminConfigMapper.tightenRateLimit(rateLimit, factor) : rateLimit,
      autoBan: attack ? AdminConfigMapper.tightenAutoBan(autoBan) : autoBan,
      userAgent: attack ? AdminConfigMapper.tightenUserAgent(base.userAgent) : base.userAgent,
      whitelist: overrides.whitelist ?? base.whitelist,
      blacklist: overrides.blacklist ? { ...base.blacklist, ...overrides.blacklist } : base.blacklist,
    };
  }

  static toSettings(base: ShieldConfig, overrides: AdminOverrides): AdminSettings {
    const rateLimit = AdminConfigMapper.resolveRateLimit(base, overrides);
    return {
      rateLimit: rateLimit
        ? { limit: rateLimit.limit, ttl: rateLimit.ttl, algorithm: rateLimit.algorithm }
        : null,
      whitelist: overrides.whitelist ?? base.whitelist ?? {},
      blacklist: overrides.blacklist ?? base.blacklist ?? {},
      autoBan: AdminConfigMapper.resolveAutoBan(base, overrides) ?? null,
    };
  }

  static effectiveRateLimit(
    effective: ShieldConfig,
  ): { limit: number; ttl: number } | null {
    if (!effective.rateLimit) return null;
    return { limit: effective.rateLimit.limit, ttl: effective.rateLimit.ttl };
  }

  private static resolveRateLimit(
    base: ShieldConfig,
    overrides: AdminOverrides,
  ): RateLimitConfig | undefined {
    if (overrides.rateLimit === null) return undefined;
    if (!overrides.rateLimit) return base.rateLimit;
    return { ...base.rateLimit, ...overrides.rateLimit };
  }

  private static resolveAutoBan(
    base: ShieldConfig,
    overrides: AdminOverrides,
  ): AutoBanConfig | undefined {
    if (overrides.autoBan === null) return undefined;
    return overrides.autoBan ?? base.autoBan;
  }

  private static tightenRateLimit(rateLimit: RateLimitConfig | undefined, factor: number): RateLimitConfig {
    const source = rateLimit ?? ATTACK_FALLBACK_RATE_LIMIT;
    return { ...rateLimit, ...source, limit: Math.max(1, Math.floor(source.limit / factor)) };
  }

  private static tightenAutoBan(autoBan: AutoBanConfig | undefined): AutoBanConfig {
    const source = autoBan ?? ATTACK_FALLBACK_AUTO_BAN;
    return { ...source, threshold: Math.max(1, Math.ceil(source.threshold / 2)) };
  }

  private static tightenUserAgent(userAgent: UserAgentConfig | undefined): UserAgentConfig {
    return {
      ...userAgent,
      requirePresent: true,
      block: [...(userAgent?.block ?? []), ATTACK_BOT_PATTERN],
    };
  }
}
