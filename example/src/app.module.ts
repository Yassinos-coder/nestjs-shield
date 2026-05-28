import { Module } from '@nestjs/common';
import { ShieldModule } from 'nestjs-shield';
import { DemoController } from './controllers/demo.controller';

@Module({
  imports: [
    ShieldModule.forRoot({
      enabled: true,
      trustProxy: false,

      storage: 'memory',

      rateLimit: {
        algorithm: 'token-bucket',
        limit: 60,
        ttl: 60_000,
        keyBy: 'ip',
        headers: true,
        standardHeaders: 'draft-7',
      },

      whitelist: {
        cidrs: ['127.0.0.1/32'],
      },

      blacklist: {
        ips: ['10.10.10.10'],
        statusCode: 403,
      },

      autoBan: {
        threshold: 5,
        window: 60_000,
        banDuration: 5 * 60_000,
        escalate: true,
      },

      slowDown: {
        delayAfter: 30,
        delayMs: (hit) => Math.min(hit * 100, 2000),
        maxDelayMs: 2000,
      },

      userAgent: {
        block: [/bad-bot/i, 'evil-scraper'],
        requirePresent: false,
      },

      burst: {
        maxConcurrent: 20,
      },

      payload: {
        maxBodyBytes: 1_000_000,
        maxHeaderBytes: 16 * 1024,
      },

      response: {
        rateLimit429: {
          message: 'Slow down — too many requests',
          code: 'RATE_LIMITED',
          includeRetryAfter: true,
        },
        blocked403: {
          message: 'Access denied',
          code: 'ACCESS_DENIED',
        },
        payload413: {
          message: 'Payload too large',
          code: 'PAYLOAD_TOO_LARGE',
        },
        onReject: (_req, _res, info) => {
          console.warn(
            `[shield] reject ip=${info.ip} layer=${info.layer} status=${info.status} reason=${info.reason}`,
          );
        },
      },
    }),
  ],
  controllers: [DemoController],
})
export class AppModule {}
