import type { RateLimitAlgorithm, ShieldConfig, StorageOption, TrustProxyOption } from '../shield.types';

type Env = Record<string, string | undefined>;

const ALGORITHMS: RateLimitAlgorithm[] = ['token-bucket', 'sliding-window', 'sliding-window-log', 'fixed-window', 'leaky-bucket'];

export class EnvConfig {
  static build(env: Env, overrides: ShieldConfig = {}): ShieldConfig {
    const config: ShieldConfig = {
      enabled: EnvConfig.flag(env.SHIELD_ENABLED, true),
      trustProxy: EnvConfig.trustProxy(env.SHIELD_TRUST_PROXY),
      storage: EnvConfig.storage(env),
      rateLimit: {
        algorithm: EnvConfig.algorithm(env.SHIELD_ALGORITHM),
        limit: EnvConfig.number(env.SHIELD_LIMIT, 60),
        ttl: EnvConfig.number(env.SHIELD_TTL, 60_000),
      },
      autoBan: {
        threshold: EnvConfig.number(env.SHIELD_AUTOBAN_THRESHOLD, 10),
        window: EnvConfig.number(env.SHIELD_AUTOBAN_WINDOW, 60_000),
        banDuration: EnvConfig.number(env.SHIELD_AUTOBAN_DURATION, 5 * 60_000),
        escalate: true,
      },
      probes: EnvConfig.flag(env.SHIELD_PROBES, true),
    };

    const burst = EnvConfig.optionalNumber(env.SHIELD_BURST_MAX);
    if (burst) config.burst = { maxConcurrent: burst };
    const body = EnvConfig.optionalNumber(env.SHIELD_MAX_BODY_BYTES);
    if (body) config.payload = { maxBodyBytes: body };
    const skip = env.SHIELD_SKIP_PATHS;
    if (skip) config.skipPaths = skip.split(',').map((path) => path.trim()).filter(Boolean);

    return { ...config, ...overrides, rateLimit: { ...config.rateLimit!, ...overrides.rateLimit } };
  }

  private static storage(env: Env): StorageOption {
    const url = env.SHIELD_REDIS_URL || env.REDIS_URL;
    return url ? { type: 'redis', url } : 'memory';
  }

  private static trustProxy(value: string | undefined): TrustProxyOption {
    if (!value) return false;
    if (value === 'cloudflare') return 'cloudflare';
    if (value === 'true') return true;
    if (value === 'false') return false;
    const hops = Number(value);
    return Number.isInteger(hops) && hops > 0 ? hops : false;
  }

  private static algorithm(value: string | undefined): RateLimitAlgorithm | undefined {
    return ALGORITHMS.find((algorithm) => algorithm === value);
  }

  private static flag(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === '') return fallback;
    return !['false', '0', 'off', 'no'].includes(value.toLowerCase());
  }

  private static number(value: string | undefined, fallback: number): number {
    return EnvConfig.optionalNumber(value) ?? fallback;
  }

  private static optionalNumber(value: string | undefined): number | undefined {
    const parsed = Number(value);
    return value && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
}
