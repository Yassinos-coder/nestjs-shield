import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  META_BLACKLIST,
  META_BURST,
  META_MAX_PAYLOAD,
  META_RATE_LIMIT,
  META_SKIP,
  META_SLOW_DOWN,
  META_UA,
  META_WHITELIST,
  SHIELD_ENGINE,
  ShieldLayer,
} from './shield.constants';
import { ShieldEngine } from './shield.engine';
import type {
  AnyRequest,
  AnyResponse,
  BurstConfig,
  DecoratorOverrides,
  IpListConfig,
  PayloadConfig,
  RateLimitConfig,
  SlowDownConfig,
  UserAgentConfig,
} from './shield.types';

@Injectable()
export class ShieldGuard implements CanActivate {
  constructor(
    @Inject(SHIELD_ENGINE) private readonly engine: ShieldEngine,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const http = context.switchToHttp();
    const req = http.getRequest<AnyRequest>();
    const res = http.getResponse<AnyResponse>();

    const overrides = this.collectOverrides(context);
    const decision = await this.engine.run(req, res, overrides);

    if (!decision.allowed) {
      if (decision.exception) throw decision.exception;
      return false;
    }

    if (decision.release) {
      const fired = { done: false };
      const fire = () => {
        if (fired.done) return;
        fired.done = true;
        Promise.resolve(decision.release?.()).catch(() => undefined);
      };
      if (typeof res.on === 'function') {
        res.on('finish', fire);
        res.on('close', fire);
      } else {
        setImmediate(fire);
      }
    }

    if (decision.delayMs && decision.delayMs > 0) {
      await new Promise((r) => setTimeout(r, decision.delayMs));
    }

    return true;
  }

  private collectOverrides(context: ExecutionContext): DecoratorOverrides {
    const targets = [context.getHandler(), context.getClass()];

    const skip = this.reflector.getAllAndOverride<true | ShieldLayer[]>(META_SKIP, targets);
    const rateLimit = this.reflector.getAllAndOverride<RateLimitConfig>(META_RATE_LIMIT, targets);
    const blacklist = this.reflector.getAllAndOverride<IpListConfig>(META_BLACKLIST, targets);
    const whitelist = this.reflector.getAllAndOverride<IpListConfig>(META_WHITELIST, targets);
    const slowDown = this.reflector.getAllAndOverride<SlowDownConfig>(META_SLOW_DOWN, targets);
    const maxPayload = this.reflector.getAllAndOverride<PayloadConfig>(META_MAX_PAYLOAD, targets);
    const burst = this.reflector.getAllAndOverride<BurstConfig>(META_BURST, targets);
    const userAgent = this.reflector.getAllAndOverride<UserAgentConfig>(META_UA, targets);

    return {
      skip,
      rateLimit: rateLimit
        ? ({ ...rateLimit, limit: rateLimit.limit, ttl: rateLimit.ttl } as DecoratorOverrides['rateLimit'])
        : undefined,
      blacklist,
      whitelist,
      slowDown,
      maxPayload,
      burst,
      userAgent,
    };
  }
}
