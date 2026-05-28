import { Inject, Injectable } from '@nestjs/common';
import { AutoBanCheck } from './checks/auto-ban.check';
import { BlacklistCheck } from './checks/blacklist.check';
import { BurstCheck } from './checks/burst.check';
import { PayloadCheck } from './checks/payload.check';
import { RateLimitCheck } from './checks/rate-limit.check';
import { SlowDownCheck } from './checks/slow-down.check';
import { UserAgentCheck } from './checks/user-agent.check';
import { WhitelistCheck } from './checks/whitelist.check';
import {
  ShieldBlockedException,
  ShieldPayloadException,
  ShieldRateLimitException,
} from './exceptions/shield.exceptions';
import {
  SHIELD_CONFIG,
  SHIELD_STORAGE,
  ShieldLayer,
} from './shield.constants';
import type {
  AnyRequest,
  AnyResponse,
  DecoratorOverrides,
  ShieldConfig,
} from './shield.types';
import type { ShieldStorage } from './storage/shield-storage.interface';
import { HeadersUtil } from './utils/headers.util';
import { IpUtil } from './utils/ip.util';
import { UaUtil } from './utils/ua.util';

export interface EngineDecision {
  allowed: boolean;
  delayMs?: number;
  release?: () => Promise<void> | void;
  ip: string;
  exception?: ShieldRateLimitException | ShieldBlockedException | ShieldPayloadException;
}

@Injectable()
export class ShieldEngine {
  constructor(
    @Inject(SHIELD_CONFIG) private readonly config: ShieldConfig,
    @Inject(SHIELD_STORAGE) private readonly storage: ShieldStorage,
  ) {}

  getConfig(): ShieldConfig {
    return this.config;
  }

  getStorage(): ShieldStorage {
    return this.storage;
  }

  async run(
    req: AnyRequest,
    res: AnyResponse,
    overrides: DecoratorOverrides = {},
  ): Promise<EngineDecision> {
    if (this.config.enabled === false) return { allowed: true, ip: '' };

    const ip = this.config.ipResolver
      ? this.config.ipResolver(req)
      : IpUtil.resolve(req, this.config.trustProxy);

    if (overrides.skip === true) return { allowed: true, ip };
    const skipSet = new Set<ShieldLayer>(Array.isArray(overrides.skip) ? overrides.skip : []);

    const whitelist = this.merge(this.config.whitelist, overrides.whitelist);
    if (!skipSet.has('whitelist')) {
      const wl = WhitelistCheck.run(ip, whitelist);
      if (wl.allowed && wl.layer === 'whitelist') return { allowed: true, ip };
    }

    const blacklist = this.merge(this.config.blacklist, overrides.blacklist);
    if (!skipSet.has('blacklist')) {
      const bl = BlacklistCheck.run(ip, blacklist);
      if (!bl.allowed) {
        await AutoBanCheck.recordViolation(this.storage, ip, this.config.autoBan);
        this.notifyReject(req, res, ip, bl.layer ?? 'blacklist', bl.reason ?? 'blocked', bl.status ?? 403);
        return {
          allowed: false,
          ip,
          exception: new ShieldBlockedException({
            message: this.config.response?.blocked403?.message ?? bl.reason ?? 'Forbidden',
            code: this.config.response?.blocked403?.code,
            layer: 'blacklist',
            status: bl.status,
          }),
        };
      }
    }

    if (!skipSet.has('auto-ban')) {
      const ab = await AutoBanCheck.check(this.storage, ip, this.config.autoBan);
      if (!ab.allowed) {
        if (ab.retryAfterMs) HeadersUtil.writeRetryAfter(res, ab.retryAfterMs);
        this.notifyReject(req, res, ip, 'auto-ban', ab.reason ?? 'banned', ab.status ?? 403, ab.retryAfterMs);
        return {
          allowed: false,
          ip,
          exception: new ShieldBlockedException({
            message: this.config.response?.blocked403?.message ?? ab.reason ?? 'Forbidden',
            code: this.config.response?.blocked403?.code,
            layer: 'auto-ban',
            retryAfter: ab.retryAfterMs ? Math.ceil(ab.retryAfterMs / 1000) : undefined,
          }),
        };
      }
    }

    const ua = UaUtil.extract(req.headers);
    const userAgent = (overrides.userAgent ?? this.config.userAgent) as
      | ShieldConfig['userAgent']
      | undefined;
    if (!skipSet.has('user-agent')) {
      const uaOut = UserAgentCheck.run(ua, userAgent);
      if (!uaOut.allowed) {
        await AutoBanCheck.recordViolation(this.storage, ip, this.config.autoBan);
        this.notifyReject(req, res, ip, 'user-agent', uaOut.reason ?? 'blocked', 403);
        return {
          allowed: false,
          ip,
          exception: new ShieldBlockedException({
            message: this.config.response?.blocked403?.message ?? uaOut.reason ?? 'Forbidden',
            code: this.config.response?.blocked403?.code,
            layer: 'user-agent',
          }),
        };
      }
    }

    const payload = (overrides.maxPayload ?? this.config.payload) as
      | ShieldConfig['payload']
      | undefined;
    if (!skipSet.has('payload')) {
      const pl = PayloadCheck.run(req, payload);
      if (!pl.allowed) {
        this.notifyReject(req, res, ip, 'payload', pl.reason ?? 'too large', pl.status ?? 413);
        return {
          allowed: false,
          ip,
          exception: new ShieldPayloadException({
            message: this.config.response?.payload413?.message ?? pl.reason ?? 'Payload too large',
            code: this.config.response?.payload413?.code,
            layer: 'payload',
          }),
        };
      }
    }

    let release: (() => Promise<void> | void) | undefined;
    const burst = (overrides.burst ?? this.config.burst) as ShieldConfig['burst'];
    if (!skipSet.has('burst') && burst) {
      const burstOut = await BurstCheck.check(this.storage, ip, burst);
      if (!burstOut.allowed) {
        this.notifyReject(req, res, ip, 'burst', burstOut.reason ?? 'too many concurrent', 429);
        return {
          allowed: false,
          ip,
          exception: new ShieldRateLimitException({
            message: this.config.response?.rateLimit429?.message ?? burstOut.reason ?? 'Too many concurrent requests',
            code: this.config.response?.rateLimit429?.code,
            layer: 'burst',
          }),
        };
      }
      release = burstOut.release;
    }

    const rateLimit = this.mergeRateLimit(overrides);
    let rateLimitTtl = 0;
    if (!skipSet.has('rate-limit') && rateLimit) {
      const rl = await RateLimitCheck.check(this.storage, req, ip, rateLimit);
      rateLimitTtl = rateLimit.ttl;
      if (rateLimit.headers !== false) {
        HeadersUtil.writeRateLimit(
          res,
          rateLimit.standardHeaders ?? 'draft-7',
          rl.limit,
          rl.remaining,
          rl.resetMs,
        );
      }
      if (!rl.allowed) {
        if (this.config.response?.rateLimit429?.includeRetryAfter !== false && rl.retryAfterMs) {
          HeadersUtil.writeRetryAfter(res, rl.retryAfterMs);
        }
        await AutoBanCheck.recordViolation(this.storage, ip, this.config.autoBan);
        if (release) await release();
        this.notifyReject(req, res, ip, 'rate-limit', rl.reason ?? 'rate limited', 429, rl.retryAfterMs);
        return {
          allowed: false,
          ip,
          exception: new ShieldRateLimitException({
            message: this.config.response?.rateLimit429?.message ?? rl.reason ?? 'Too many requests',
            code: this.config.response?.rateLimit429?.code,
            layer: 'rate-limit',
            retryAfter: rl.retryAfterMs ? Math.ceil(rl.retryAfterMs / 1000) : undefined,
          }),
        };
      }
    }

    let delayMs: number | undefined;
    const slowDown = (overrides.slowDown ?? this.config.slowDown) as ShieldConfig['slowDown'];
    if (!skipSet.has('slow-down') && slowDown) {
      const sd = await SlowDownCheck.check(
        this.storage,
        ip,
        rateLimitTtl || 60_000,
        slowDown,
      );
      if (sd.delayMs && sd.delayMs > 0) delayMs = sd.delayMs;
    }

    return { allowed: true, ip, delayMs, release };
  }

  private merge<T extends object>(
    base: T | undefined,
    override: T | undefined,
  ): T | undefined {
    if (!base && !override) return undefined;
    if (!base) return override;
    if (!override) return base;
    return { ...base, ...override };
  }

  private mergeRateLimit(overrides: DecoratorOverrides): ShieldConfig['rateLimit'] {
    if (!this.config.rateLimit && !overrides.rateLimit) return undefined;
    if (overrides.rateLimit) {
      return { ...(this.config.rateLimit ?? {}), ...overrides.rateLimit };
    }
    return this.config.rateLimit;
  }

  private notifyReject(
    req: AnyRequest,
    res: AnyResponse,
    ip: string,
    layer: ShieldLayer,
    reason: string,
    status: number,
    retryAfterMs?: number,
  ): void {
    const hook = this.config.response?.onReject;
    if (!hook) return;
    try {
      hook(req, res, { ip, layer, reason, status, retryAfterMs });
    } catch {
      // observability hook must never break the pipeline
    }
  }
}
