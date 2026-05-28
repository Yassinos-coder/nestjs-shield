import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  Blacklist,
  BurstLimit,
  MaxPayload,
  RateLimit,
  SkipShield,
  SlowDown,
  UserAgentPolicy,
  Whitelist,
} from 'nestjs-shield';

@Controller('demo')
export class DemoController {
  @Get()
  hello() {
    return { ok: true, message: 'covered by the global shield config' };
  }

  @Get('strict')
  @RateLimit({ algorithm: 'sliding-window-log', limit: 5, ttl: 10_000 })
  strict() {
    return { ok: true, message: '5 requests per 10s — sliding window log' };
  }

  @Get('slow')
  @SlowDown({ delayAfter: 2, delayMs: 500, maxDelayMs: 3000 })
  slow() {
    return { ok: true, message: 'extra 500ms delay after the second hit' };
  }

  @Get('strict-ua')
  @UserAgentPolicy({ block: [/curl/i, /python-requests/i], requirePresent: true })
  strictUa() {
    return { ok: true, message: 'curl/python UAs are rejected here' };
  }

  @Post('upload')
  @MaxPayload({ maxBodyBytes: 16 * 1024 })
  upload(@Body() body: unknown) {
    return { ok: true, received: typeof body };
  }

  @Get('burst-light')
  @BurstLimit({ maxConcurrent: 2 })
  burst() {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ ok: true, message: 'held 1.5s' }), 1500),
    );
  }

  @Get('vip')
  @Whitelist({ cidrs: ['192.168.0.0/16'] })
  vip() {
    return { ok: true, message: 'whitelisted CIDR bypasses all shield checks' };
  }

  @Get('blocked-net')
  @Blacklist({ cidrs: ['203.0.113.0/24'] })
  blocked() {
    return { ok: true, message: 'this route additionally blocks an extra CIDR' };
  }

  @Get('skipped')
  @SkipShield()
  skipped() {
    return { ok: true, message: 'bypasses every shield layer' };
  }

  @Get('skip-rate-limit-only')
  @SkipShield('rate-limit')
  skipRl() {
    return { ok: true, message: 'still does UA/blacklist/etc — only rate limit skipped' };
  }
}
