# nestjs-shield

Layered API protection for NestJS in a single drop-in module.

- **Rate limiting** with five algorithms — token bucket (default), sliding window counter, sliding window log, fixed window, leaky bucket
- **IP allow / block lists** with CIDR support
- **Auto-ban** that escalates repeated abusers to a temporary block
- **Slow-down** that adds progressive delay before issuing a hard 429
- **User-Agent filtering** with block / allow / require-present
- **Burst protection** — concurrent in-flight cap per IP (slowloris cover)
- **Payload limits** — body + header byte caps
- **Pluggable storage** — in-memory (default) or Redis (atomic Lua scripts) — bring your own adapter for anything else
- **Per-route overrides** via decorators
- **Standard rate-limit headers** (draft-7 by default, draft-6 supported)

No geo-fencing in v1. No dependency on `@nestjs/throttler` — the engine is standalone.

## Install

From the public npm registry:

```bash
npm install nestjs-shield
# optional, only if you use Redis storage
npm install ioredis
```

Or from GitHub Packages (published as `@yassinos-coder/nestjs-shield`) — first create a project-local `.npmrc` mapping the scope to GitHub Packages and a personal access token with `read:packages`:

```ini
# .npmrc
@yassinos-coder:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
GITHUB_TOKEN=ghp_xxx npm install @yassinos-coder/nestjs-shield
```

Node ≥ 18, NestJS 9 / 10 / 11.

## Quick start

### Option A — global guard via `forRoot` (recommended)

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ShieldModule } from 'nestjs-shield';

@Module({
  imports: [
    ShieldModule.forRoot({
      rateLimit: { algorithm: 'token-bucket', limit: 60, ttl: 60_000 },
      autoBan:   { threshold: 10, window: 60_000, banDuration: 5 * 60_000, escalate: true },
      blacklist: { ips: ['10.10.10.10'] },
    }),
  ],
})
export class AppModule {}
```

### Option B — middleware-style, configured from `main.ts`

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { Shield } from 'nestjs-shield';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  Shield.applyTo(app, {
    rateLimit: { limit: 60, ttl: 60_000 },
    burst: { maxConcurrent: 50 },
  });
  await app.listen(3000);
}
bootstrap();
```

You can use both together — when you do, `applyTo` resolves the engine already created by `ShieldModule` (one config drives both).

### `forRootAsync` with ConfigService

```ts
ShieldModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) => ({
    rateLimit: {
      limit: cfg.get<number>('RATE_LIMIT', 60),
      ttl:   cfg.get<number>('RATE_TTL', 60_000),
    },
    storage: { type: 'redis', client: new Redis(cfg.get('REDIS_URL')!) },
  }),
});
```

## Configuration reference

```ts
interface ShieldConfig {
  enabled?: boolean;                       // default true
  trustProxy?: boolean | number;           // false; number = trust N proxies left of the client
  ipResolver?: (req) => string;            // your own IP extraction

  storage?:
    | 'memory'
    | { type: 'memory'; maxKeys?: number } // default 100_000
    | { type: 'redis'; client: Redis; keyPrefix?: string }
    | ShieldStorage;                       // bring your own

  rateLimit?: {
    algorithm?: 'token-bucket' | 'sliding-window' | 'sliding-window-log' | 'fixed-window' | 'leaky-bucket';
    limit: number;
    ttl: number;                           // ms
    keyBy?: 'ip' | { header: string } | ((req) => string);
    skip?: (req) => boolean;
    headers?: boolean;                     // default true
    standardHeaders?: 'draft-6' | 'draft-7';
  };

  whitelist?: { ips?: string[]; cidrs?: string[] };
  blacklist?: { ips?: string[]; cidrs?: string[]; statusCode?: number };

  autoBan?: {
    threshold: number;                     // # of 429/403s before ban
    window: number;                        // ms — count window
    banDuration: number;                   // ms — initial ban
    escalate?: boolean;                    // 2× each repeat ban, default true
  };

  slowDown?: {
    delayAfter: number;
    delayMs: number | ((hit: number) => number);
    maxDelayMs?: number;
  };

  userAgent?: {
    block?: (string | RegExp)[];
    allow?: (string | RegExp)[];           // overrides block when matched
    requirePresent?: boolean;
  };

  burst?: { maxConcurrent: number };

  payload?: { maxBodyBytes?: number; maxHeaderBytes?: number };

  response?: {
    rateLimit429?: { message?: string; code?: string; includeRetryAfter?: boolean };
    blocked403?:   { message?: string; code?: string };
    payload413?:   { message?: string; code?: string };
    onReject?:     (req, res, info) => void;   // observability
  };
}
```

## Algorithms

All algorithms share the same `{ limit, ttl }` knobs and the same storage interface, so switching is one config line.

| Algorithm | Storage cost | Burst behavior | Smoothness | Use when |
| --- | --- | --- | --- | --- |
| `token-bucket` (default) | 2 small numbers per IP | Allows initial burst up to `limit`, then drips | Smooth | General-purpose bursty APIs |
| `sliding-window` | 2 counters | Cannot 2× at window edges | Smooth | When fairness matters and storage is precious |
| `sliding-window-log` | one sorted set | Exact | Exact | Strict compliance, smaller scale |
| `fixed-window` | 1 counter | Allows up to 2× at window boundary | Stepped | Cheapest, very large scale, edge-burst OK |
| `leaky-bucket` | 2 small numbers per IP | Queue overflow rejects | Very smooth | Outbound shaping, traffic smoothing |

## Pipeline order

Every request runs the chain in this fixed order, short-circuiting on the first reject:

1. `whitelist` — allow ⇒ skip everything else
2. `blacklist` — block ⇒ 403
3. `auto-ban` — banned ⇒ 403 with `Retry-After`
4. `user-agent` — blocked ⇒ 403
5. `payload` — too large ⇒ 413
6. `burst` — too many in-flight ⇒ 429
7. `rate-limit` — over limit ⇒ 429, also feeds auto-ban
8. `slow-down` — in soft zone ⇒ delay, then allow

## Decorators (per-route overrides)

```ts
import {
  RateLimit, SkipShield, Blacklist, Whitelist,
  SlowDown, MaxPayload, BurstLimit, UserAgentPolicy,
} from 'nestjs-shield';

@Controller('api')
export class ApiController {
  @Get('hot')
  @RateLimit({ algorithm: 'sliding-window-log', limit: 5, ttl: 10_000 })
  hot() {}

  @Get('health')
  @SkipShield()                       // bypass all checks
  health() {}

  @Get('mixed')
  @SkipShield('rate-limit', 'slow-down')   // skip specific layers only
  mixed() {}

  @Post('upload')
  @MaxPayload({ maxBodyBytes: 1_000_000 })
  upload() {}

  @Get('strict-ua')
  @UserAgentPolicy({ block: [/curl/i], requirePresent: true })
  strictUa() {}

  @Get('vip')
  @Whitelist({ cidrs: ['192.168.0.0/16'] })
  vip() {}

  @Get('blocked-net')
  @Blacklist({ cidrs: ['203.0.113.0/24'] })
  blocked() {}

  @Get('long')
  @BurstLimit({ maxConcurrent: 2 })
  long() {}

  @Get('slow')
  @SlowDown({ delayAfter: 5, delayMs: 250 })
  slow() {}
}
```

Decorators merge over the global config — anything you omit falls through to the global setting.

## Storage adapters

### Memory (default)

```ts
ShieldModule.forRoot({
  storage: { type: 'memory', maxKeys: 200_000 },   // LRU evicts oldest 10% when full
});
```

Per-process. Counters reset on restart. Fine for single-instance services.

### Redis (multi-pod)

```ts
import Redis from 'ioredis';

ShieldModule.forRoot({
  storage: {
    type: 'redis',
    client: new Redis(process.env.REDIS_URL!),
    keyPrefix: 'myapp',   // optional
  },
});
```

All algorithms use atomic Lua scripts loaded via `defineCommand`, so token-bucket math is race-free across pods on the same key.

### Bring your own

Implement `ShieldStorage` (15 methods, all small) and pass it as `storage: yourAdapter`.

## Standard headers

Default is RFC draft-7:

```http
RateLimit-Limit: 60
RateLimit-Remaining: 41
RateLimit-Reset: 23
RateLimit-Policy: 60;w=23
```

On 429, also `Retry-After: <seconds>`. Switch to draft-6 (`X-RateLimit-*`) with `rateLimit.standardHeaders = 'draft-6'`.

## Auto-ban

Every 429/403 emitted by the rate-limit, blacklist, or UA layer increments a violation counter for the offending IP, scoped by `autoBan.window`. When the counter crosses `autoBan.threshold`, the IP is placed in a temporary ban for `autoBan.banDuration`. If `escalate: true` (default), each subsequent ban doubles the previous duration.

Subsequent requests from a banned IP are rejected via a cheap `GET` on a `shield:ban:<ip>` key before any other check runs.

## Slow-down

After `slowDown.delayAfter` requests in the rate-limit window, additional requests get an artificial delay computed from `delayMs` (number or function of the over-count), capped by `maxDelayMs`. The hard rate-limit still applies — slow-down only smooths approach to the cliff.

## Behind a proxy

```ts
ShieldModule.forRoot({
  trustProxy: 1,     // trust 1 hop — picks XFF[length - 2]
});
```

Or provide a custom `ipResolver`. For Cloudflare, pulling `cf-connecting-ip` is a one-liner.

## Observability

```ts
response: {
  onReject: (req, res, info) => {
    metrics.increment('shield.reject', { layer: info.layer, status: info.status });
  },
},
```

`info` is `{ layer, ip, reason, status, retryAfterMs? }`. The hook is wrapped in try/catch and never breaks the pipeline.

## Example

A runnable end-to-end example lives in [`example/`](./example) — see its README.

## Publishing

This repo publishes to two registries with one workflow ([.github/workflows/publish.yml](.github/workflows/publish.yml)):

| Registry | Name there | Auth |
| --- | --- | --- |
| npm public (`registry.npmjs.org`) | `nestjs-shield` | `NPM_TOKEN` repo secret |
| GitHub Packages (`npm.pkg.github.com`) | `@yassinos-coder/nestjs-shield` | auto `GITHUB_TOKEN` |

The workflow runs on each published GitHub Release, on pushes of `v*.*.*` tags, and via manual dispatch (where you can pick `npm`, `github`, or `both`). The GitHub Packages job renames the package on the fly with `npm pkg set name=@yassinos-coder/nestjs-shield` so the same source tree maps cleanly to both registries.

### One-time setup

1. **`NPM_TOKEN` repo secret** — required only for the npm public job.
   - Go to [npmjs.com → Access Tokens](https://www.npmjs.com/settings/yassinoscoder/tokens) → *Generate New Token* → *Classic Token* → *Automation* (skips 2FA).
   - In the GitHub repo: *Settings → Secrets and variables → Actions → New repository secret* → name `NPM_TOKEN`, paste the token.
2. **`GITHUB_TOKEN`** — nothing to do. GitHub Actions provides this automatically.

### Releasing

```bash
# bump version + tag
npm version 1.0.1
git push --follow-tags
```

Or create a GitHub Release from the UI — the workflow fires on `release: published` too.

### Manual local publish (alternative)

If you'd rather publish from your machine instead of CI:

```bash
# npm public
npm login              # browser flow
npm publish --access public

# GitHub Packages — needs a PAT with write:packages
echo "//npm.pkg.github.com/:_authToken=ghp_xxx" >> ~/.npmrc
npm pkg set name=@yassinos-coder/nestjs-shield
npm publish --registry=https://npm.pkg.github.com --access public
npm pkg set name=nestjs-shield   # revert
```

## License

MIT
