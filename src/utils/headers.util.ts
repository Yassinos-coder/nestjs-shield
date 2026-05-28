import type { AnyResponse } from '../shield.types';

export class HeadersUtil {
  static writeRateLimit(
    res: AnyResponse,
    standard: 'draft-6' | 'draft-7',
    limit: number,
    remaining: number,
    resetMs: number,
  ): void {
    const resetSec = Math.max(0, Math.ceil(resetMs / 1000));
    if (standard === 'draft-7') {
      res.setHeader('RateLimit-Limit', String(limit));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, remaining)));
      res.setHeader('RateLimit-Reset', String(resetSec));
      res.setHeader('RateLimit-Policy', `${limit};w=${resetSec || 1}`);
    } else {
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
      res.setHeader('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + resetSec));
    }
  }

  static writeRetryAfter(res: AnyResponse, retryAfterMs: number): void {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
  }
}
