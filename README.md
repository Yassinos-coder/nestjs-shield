# nestjs-shield

**Protect your NestJS API in one module.** Rate limiting, automatic bans, IP lists, bot and scanner blocking, and a built-in admin dashboard, with no extra services required.

```ts
// app.module.ts
@Module({ imports: [ShieldModule.forEnv()] })
export class AppModule {}
```

That is a working setup: every route is rate limited, repeat abusers are banned for a while, and scanners hitting `/.env` or `/wp-login.php` are caught. Everything is tuned from environment variables.

**Want it already wired into a full API?** Deploy the ready-made NestJS starter (API + Redis, with nestjs-shield, input sanitization and an `AGENTS.md` for AI coding agents) in one click:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/nestjs-api-redis)

Source: [nestjs-api-railway-template](https://github.com/Yassinos-coder/nestjs-api-railway-template)

**On this page:** [Install](#install) · [Quick start](#quick-start) · [Behind a proxy](#behind-a-proxy-do-this-first) · [What it protects against](#what-it-protects-against) · [Configuration](#configuration) · [Recipes](#recipes) · [Admin dashboard](#admin-dashboard) · [Reference](#reference) · [Troubleshooting](#troubleshooting)

---

## Install

```bash
npm install nestjs-shield
npm install ioredis   # only if you want Redis (recommended for more than one server)
```

Needs Node 18+ and NestJS 9, 10, 11 or 12 on the Express adapter (NestJS 12 needs Node 20+).
Also published to GitHub Packages as `@yassinos-coder/nestjs-shield` ([how](#publishing-for-maintainers)).

## Quick start

### Option 1: configure with environment variables (recommended)

```ts
import { ShieldModule } from 'nestjs-shield';

@Module({
  imports: [ShieldModule.forEnv()],
})
export class AppModule {}
```

```env
# .env: all optional, these are the defaults
SHIELD_LIMIT=60                 # requests allowed per window, per client
SHIELD_TTL=60000                # window length in milliseconds
SHIELD_TRUST_PROXY=cloudflare   # see "Behind a proxy" below
REDIS_URL=redis://localhost:6379   # leave empty to keep counters in memory
```

The full list of variables is in [Configuration](#configuration).

### Option 2: configure in code

```ts
ShieldModule.forRoot({
  trustProxy: 'cloudflare',
  rateLimit: { limit: 60, ttl: 60_000 },
  autoBan: { threshold: 10, window: 60_000, banDuration: 5 * 60_000 },
  probes: true,
});
```

### Option 3: configure from your own config service

```ts
ShieldModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    trustProxy: 'cloudflare',
    storage: { type: 'redis', url: config.getOrThrow('REDIS_URL') },
    rateLimit: { limit: config.get('RATE_LIMIT', 60), ttl: 60_000 },
  }),
});
```

### Option 4: middleware style, from `main.ts`

```ts
import { Shield } from 'nestjs-shield';

const app = await NestFactory.create(AppModule);
Shield.applyTo(app, { rateLimit: { limit: 60, ttl: 60_000 } });
```

You can combine this with `ShieldModule`; the module's configuration is then reused.

---

## Behind a proxy: do this first

If your app runs behind Cloudflare, Railway, Render, nginx or any load balancer, the shield must be told how to find the **real visitor IP**. Without this every visitor looks like the proxy, and they all share one rate limit and one ban.

| Your setup | Set |
| --- | --- |
| Cloudflare, Railway, Render | `trustProxy: 'cloudflare'` |
| One reverse proxy (nginx, Caddy, a load balancer) | `trustProxy: 1` |
| Two proxies in a row | `trustProxy: 2` |
| A platform with its own header (Fly.io, ...) | `ipHeader: 'fly-client-ip'` |
| Something unusual | `ipResolver: (req) => ...` |
| Directly on the internet | leave it unset |

`'cloudflare'` reads `CF-Connecting-IP` first, then the first `X-Forwarded-For` entry, then the socket address.

The shield also watches for this mistake: if requests arrive from a private address with a forwarding header and `trustProxy` is unset, it logs one warning telling you what to set.

---

## What it protects against

Every request passes these checks in this order. The first one that rejects ends the request.

| # | Layer | What it does | Rejects with |
| --- | --- | --- | --- |
| 1 | **Whitelist** | Trusted addresses skip everything else | (allowed) |
| 2 | **Blacklist** | Blocks listed IPs and CIDR ranges | 403 |
| 3 | **Auto-ban** | Temporarily bans clients that keep getting rejected; bans double on repeat offences | 403 + `Retry-After` |
| 4 | **User-Agent** | Blocks, allows or requires user agents | 403 |
| 5 | **Payload** | Caps body and header size | 413 |
| 6 | **Burst** | Caps concurrent in-flight requests per IP (slowloris cover) | 429 |
| 7 | **Rate limit** | Five algorithms, standard `RateLimit-*` headers | 429 + `Retry-After` |
| 8 | **Slow-down** | Adds a growing delay as a client nears the limit | (delayed) |

Also built in:

- **Scanner probes.** Hits on `/.env`, `/wp-login.php`, `/phpmyadmin` and similar count as violations even though no route exists for them, so scanners get auto-banned.
- **Health checks are left alone.** `/health`, `/healthz`, `/livez`, `/readyz` and `/api/health` skip the shield by default.
- **Redis can fail without taking you down.** If Redis is unreachable the shield keeps counting in memory and logs a warning, instead of failing requests.
- **Admin dashboard** with live traffic, charts, bans and editable limits.

---

## Configuration

### Environment variables (used by `forEnv()`)

| Variable | Default | What it does |
| --- | --- | --- |
| `SHIELD_ENABLED` | `true` | Set `false` to switch the shield off |
| `SHIELD_LIMIT` | `60` | Requests allowed per window, per client |
| `SHIELD_TTL` | `60000` | Window length in **milliseconds** |
| `SHIELD_ALGORITHM` | `token-bucket` | `token-bucket`, `sliding-window`, `sliding-window-log`, `fixed-window`, `leaky-bucket` |
| `SHIELD_TRUST_PROXY` | off | `cloudflare`, `true`, or a number of proxy hops |
| `SHIELD_AUTOBAN_THRESHOLD` | `10` | Rejections inside the window that trigger a ban |
| `SHIELD_AUTOBAN_WINDOW` | `60000` | Window for counting rejections, in ms |
| `SHIELD_AUTOBAN_DURATION` | `300000` | First ban length in ms (doubles on repeat offences) |
| `SHIELD_BURST_MAX` | off | Max concurrent requests per IP |
| `SHIELD_MAX_BODY_BYTES` | off | Max request body size |
| `SHIELD_PROBES` | `true` | Count scanner probes toward auto-ban |
| `SHIELD_SKIP_PATHS` | health checks | Comma-separated paths the shield ignores |
| `SHIELD_REDIS_URL` or `REDIS_URL` | memory | Use Redis for counters and bans |
| `SHIELD_DASH` | off | `true` turns on the [admin dashboard](#admin-dashboard) |
| `SHIELD_ADMIN_USER`, `SHIELD_ADMIN_PASSWORD` | none | Dashboard login (required when the dashboard is on) |
| `SHIELD_ADMIN_SECRET` | derived | Optional key that signs the dashboard session cookie |

Anything you pass to `forEnv({ ... })` overrides the environment, for example `ShieldModule.forEnv({ userAgent: { requirePresent: true } })`.

### Full option reference (`forRoot` / `forRootAsync`)

```ts
ShieldModule.forRoot({
  enabled: true,                      // master switch

  // ---- who is the client? -------------------------------------------------
  trustProxy: 'cloudflare',           // false | true | number | 'cloudflare'
  ipHeader: 'fly-client-ip',          // read the IP from this header instead
  ipResolver: (req) => '...',         // or compute it yourself

  // ---- where counters live ------------------------------------------------
  storage: 'memory',                  // default. Or { type: 'memory', maxKeys: 100_000 }
  // storage: { type: 'redis', url: process.env.REDIS_URL },        // library manages the connection
  // storage: { type: 'redis', client: myIoredisClient },           // or bring your own client
  // storage: { type: 'redis', url, failOpen: false },              // opt out of the memory fallback
  banStorage: undefined,              // keep bans in a different store than counters

  // ---- the layers (all optional) -----------------------------------------
  rateLimit: {
    algorithm: 'token-bucket',        // see "Algorithms"
    limit: 60,                        // requests per window
    ttl: 60_000,                      // window, ms
    keyBy: 'ip',                      // 'ip' | { header: 'x-api-key' } | (req) => string
    skip: (req) => false,             // exempt some requests from the limit only
    headers: true,                    // send RateLimit-* headers
    standardHeaders: 'draft-7',       // or 'draft-6' (X-RateLimit-*)
  },
  autoBan: {
    threshold: 10,                    // rejections that trigger a ban...
    window: 60_000,                   // ...within this many ms
    banDuration: 300_000,             // first ban, ms
    escalate: true,                   // double on every repeat
    maxBanDuration: 86_400_000,       // cap for escalated bans
  },
  whitelist: { ips: [], cidrs: [] },  // skip every check
  blacklist: { ips: [], cidrs: [], statusCode: 403 },
  userAgent: { block: [/curl/i], allow: [/googlebot/i], requirePresent: true },
  burst: { maxConcurrent: 50 },
  payload: { maxBodyBytes: 1_000_000, maxHeaderBytes: 16_384 },
  slowDown: { delayAfter: 30, delayMs: (hit) => hit * 50, maxDelayMs: 2_000 },

  // ---- extras -------------------------------------------------------------
  skipPaths: ['/health', '/metrics*'], // ignored entirely. '*' at the end = prefix. [] disables the defaults
  probes: true,                       // count scanner hits (true, or { paths: [...] })
  rules: { load: async () => ({ blacklist: { ips: [...] } }), refreshMs: 30_000 },

  // ---- observability ------------------------------------------------------
  response: {
    rateLimit429: { message: 'Slow down', code: 'RATE_LIMITED', includeRetryAfter: true },
    blocked403:   { message: 'Forbidden', code: 'BLOCKED' },
    payload413:   { message: 'Too large', code: 'TOO_LARGE' },
    onReject: (req, res, info) => {},  // { layer, ip, reason, status, retryAfterMs? }
  },
  onEvent: (event) => {},             // reject, ban and unban events

  admin: { attackModeFactor: 5, maxEvents: 500 },   // dashboard tuning
});
```

Every option has a short description in your editor too (hover over it).

---

## Recipes

### Use Redis (more than one server)

Memory counters are per process and reset on restart. With several instances, use Redis so everyone shares limits and bans.

```ts
ShieldModule.forRoot({ storage: { type: 'redis', url: process.env.REDIS_URL } });
// or just set REDIS_URL and use ShieldModule.forEnv()
```

The library creates and closes the connection for you (needs `ioredis` installed). Already have a client? Pass `client: yourClient` instead of `url`. If Redis goes down, requests keep working on in-memory counters and a warning is logged at most every 30 seconds.

### Change limits on one route

```ts
import { RateLimit, SkipShield, MaxPayload, UserAgentPolicy } from 'nestjs-shield';

@Controller('auth')
export class AuthController {
  @Post('login')
  @RateLimit({ limit: 5, ttl: 60_000 })            // stricter than the global limit
  login() {}

  @Post('upload')
  @MaxPayload({ maxBodyBytes: 10_000_000 })
  upload() {}

  @Get('status')
  @SkipShield()                                    // no checks at all
  status() {}

  @Get('feed')
  @SkipShield('rate-limit', 'slow-down')           // skip only some layers
  feed() {}
}
```

Other decorators: `@Blacklist`, `@Whitelist`, `@SlowDown`, `@BurstLimit`, `@UserAgentPolicy`. They merge over the global config; anything you leave out falls back to it. They work on a method or a whole controller.

### Catch vulnerability scanners

Scanners request paths like `/.env` and `/wp-login.php` that your app has no route for, so no guard ever sees them. Turn on `probes` (it is on with `forEnv()`) and those hits count as violations; enough of them and the IP is banned. It needs `autoBan` and the Express adapter.

```ts
ShieldModule.forRoot({
  autoBan: { threshold: 5, window: 60_000, banDuration: 600_000 },
  probes: true,                                  // default list
  // probes: { paths: ['/.env', /^\/wp-/, '/admin.php'] }   // or your own
});
```

### Keep IP rules in your database

```ts
ShieldModule.forRootAsync({
  imports: [DatabaseModule],
  inject: [IpRulesRepository],
  useFactory: (rules: IpRulesRepository) => ({
    rules: {
      refreshMs: 30_000,
      load: async () => ({
        whitelist: { ips: await rules.listIps('whitelist') },
        blacklist: { ips: await rules.listIps('blacklist') },
      }),
    },
  }),
});
```

Loaded rules are added to any static `whitelist` and `blacklist`. If a reload fails the last good rules stay in place.

### Ban or unban from your own code

```ts
import { ShieldService } from 'nestjs-shield';

@Injectable()
export class SecurityService {
  constructor(private readonly shield: ShieldService) {}

  block(ip: string) { return this.shield.ban(ip, 24 * 60 * 60 * 1000); }
  release(ip: string) { return this.shield.unban(ip); }
  isBlocked(ip: string) { return this.shield.isBanned(ip); }
  list() { return this.shield.listBans(); }          // { supported, bans: [{ ip, expiresAt }] }
  failedLogin(ip: string) { return this.shield.recordViolation(ip); }   // counts toward auto-ban
}
```

### Share bans between several apps

Keep bans in one Redis that all your services use, while each service keeps its own counters.

```ts
ShieldModule.forRoot({
  storage: { type: 'redis', url: process.env.REDIS_URL },
  banStorage: { type: 'redis', url: process.env.SHARED_REDIS_URL, keyPrefix: 'shared' },
});
```

### Audit log and metrics

```ts
ShieldModule.forRoot({
  onEvent: (event) => {
    if (event.type === 'reject') metrics.increment('shield.reject', { layer: event.layer });
    if (event.type === 'ban') audit.log(`banned ${event.ip} for ${event.durationMs}ms (${event.source})`);
  },
});
```

Events: `reject` (`ip`, `layer`, `reason`, `status`, `method`, `path`), `ban` (`ip`, `durationMs`, `source`: `auto`, `manual` or `probe`) and `unban`. The hook can throw without affecting requests.

### Use it with a global auth guard

The dashboard has its own login, so a global JWT or session guard must let it through. The dashboard controller is already marked public using the common metadata keys (`isPublic`, `IS_PUBLIC_KEY`, `IS_PUBLIC`, `is_public`, `public`, `skipAuth`). If your guard uses a different mechanism, check the request:

```ts
import { ShieldAdmin } from 'nestjs-shield';

canActivate(context) {
  const req = context.switchToHttp().getRequest();
  if (ShieldAdmin.isAdminRequest(req)) return true;
  // ...your normal checks
}
```

### Per-API-key limits

```ts
rateLimit: { limit: 1000, ttl: 60_000, keyBy: { header: 'x-api-key' } }   // falls back to the IP when the header is missing
```

---

## Admin dashboard

A live dashboard ships inside the package: traffic charts, blocked requests by layer, top paths and clients, response status mix, latency, active bans, and a live request feed. You can change limits, edit IP rules, ban or unban addresses and switch on **under attack mode** without redeploying.

Turn it on with environment variables:

```env
SHIELD_DASH=true
SHIELD_ADMIN_USER=admin
SHIELD_ADMIN_PASSWORD=use-a-long-random-password
```

Open `/shield/admin` (or `/api/shield/admin` if you use `app.setGlobalPrefix('api')`). It is a 404 unless `SHIELD_DASH=true`.

- **Overview**: requests, block rate, requests per minute, p95 latency, a 30-minute traffic chart, blocked requests by layer, status mix, top paths and top clients (with one-click ban).
- **Controls**: shield on/off, under attack mode (divides the rate limit by `admin.attackModeFactor`, blocks empty and bot-like user agents, tightens auto-ban), rate limit, auto-ban, whitelist and blacklist, manual bans.
- **Live traffic**: every request with the decision, layer, status and latency, with filters.

Good to know:

- Changes are saved in the shield storage and override your code config. With Redis they are shared by every instance within about 2 seconds and survive restarts. With memory storage they reset on restart. "Reset all overrides" returns to your code config.
- The traffic feed and charts are kept in memory per instance (last 500 requests, `admin.maxEvents`).
- Listing bans needs a storage that can scan keys (memory and Redis can).
- Logins use a signed, `HttpOnly`, `SameSite=Strict` cookie (8 hours), failed logins are throttled per IP, and changes require a CSRF header. The dashboard skips the shield itself, so you cannot lock yourself out. Serve it over HTTPS.
- With a global prefix it works both ways: `setGlobalPrefix('api')` serves it at `/api/shield/admin`. To serve it without the prefix use `setGlobalPrefix('api', { exclude: ['shield/admin', 'shield/admin/{*path}'] })` (NestJS 11 and 12 syntax; on NestJS 10 and below use `'shield/admin(.*)'`).
- If you use a reverse proxy that only routes certain paths to your API, make sure `/shield/admin` (or `/api/...`) reaches it.

---

## Reference

### Algorithms

All five share the same `{ limit, ttl }` settings, so changing one is a one-line edit.

| Algorithm | Storage per client | Behaviour | Use when |
| --- | --- | --- | --- |
| `token-bucket` (default) | 2 numbers | Allows a burst up to `limit`, then refills steadily | Most APIs |
| `sliding-window` | 2 counters | No double-burst at window edges | Fairness matters, storage is precious |
| `sliding-window-log` | a sorted set | Exact | Strict rules at modest scale |
| `fixed-window` | 1 counter | Up to 2x at a window boundary | Cheapest, huge scale |
| `leaky-bucket` | 2 numbers | Very smooth output | Traffic shaping |

### Response headers

Default is the IETF draft-7 style:

```text
RateLimit-Limit: 60
RateLimit-Remaining: 41
RateLimit-Reset: 23
RateLimit-Policy: 60;w=23
```

Rejected requests also get `Retry-After: <seconds>`. Use `standardHeaders: 'draft-6'` for `X-RateLimit-*`.

### Errors

Rejections are normal NestJS exceptions (`ShieldRateLimitException` 429, `ShieldBlockedException` 403, `ShieldPayloadException` 413), so your exception filters see them. The body includes `statusCode`, `code`, `message`, `layer` and `retryAfter`. Customise text and codes with `response`.

### Public API

| Export | Use |
| --- | --- |
| `ShieldModule.forEnv / forRoot / forRootAsync` | Register the module |
| `Shield.applyTo(app, config)` | Middleware style registration |
| `ShieldService` | Ban, unban, list bans, record violations, resolve IPs |
| `ShieldEngine` | Low-level pipeline (`SHIELD_ENGINE` token) |
| `@RateLimit @SkipShield @Blacklist @Whitelist @SlowDown @MaxPayload @BurstLimit @UserAgentPolicy` | Per-route overrides |
| `MemoryStorage`, `RedisStorage`, `ShieldStorage` | Storage implementations and the interface for your own |
| `ShieldAdmin.isAdminRequest(req)` | Detect dashboard requests in custom guards |
| `KEY_BAN`, `KEY_BAN_COUNT`, `KEY_VIOLATIONS`, `DEFAULT_SKIP_PATHS`, `DEFAULT_PROBE_PATHS` | Constants |

### Bring your own storage

Implement `ShieldStorage` (about 15 small methods) and pass it as `storage: yourAdapter`. Add `scan(prefix, limit)` if you want the dashboard to list bans.

---

## Troubleshooting

**Everyone gets rate limited together, or my own IP shows as the proxy's.**
You are behind a proxy and `trustProxy` is not set. See [Behind a proxy](#behind-a-proxy-do-this-first).

**The dashboard returns 404.**
`SHIELD_DASH` is not exactly `true`, or your proxy does not route the path to the API. With `setGlobalPrefix('api')` the path is `/api/shield/admin`.

**The dashboard shows a configuration error.**
`SHIELD_ADMIN_USER` and `SHIELD_ADMIN_PASSWORD` are both required.

**The server crashes at startup with a path-to-regexp error after I excluded the dashboard from the prefix.**
NestJS 11 and 12 need `'shield/admin/{*path}'`, not `'shield/admin(.*)'`.

**My global auth guard blocks the dashboard.**
See [Use it with a global auth guard](#use-it-with-a-global-auth-guard).

**Scanner hits are not counted.**
`probes` needs `autoBan` and the Express adapter. Hits are only counted for paths with no matching route.

**A ban I made does not show up in the Bans list.**
Update to 1.3.1 or later. Older versions could not list bans when your ioredis client was created with its own `keyPrefix` option. A custom storage also needs a `scan(prefix, limit)` method for the list to work.

**Limits reset when I redeploy.**
You are on memory storage. Use Redis.

**Redis went down and I saw a warning.**
Expected: the shield switched to in-memory counters for that period and recovers on its own. Set `failOpen: false` on the Redis storage if you would rather fail requests.

**Fastify.**
The core guard works on any adapter, but `probes` and the dashboard cookie handling have only been verified on Express.

---

## Example

A runnable end-to-end example is in [`example/`](example/README.md).

## Publishing (for maintainers)

This repo publishes to two registries from one workflow (`.github/workflows/publish.yml`), on a published GitHub release, on `v*.*.*` tags, or by manual dispatch.

| Registry | Name | Auth |
| --- | --- | --- |
| npm (public) | `nestjs-shield` | `NPM_TOKEN` repository secret (an automation token, so 2FA does not block CI) |
| GitHub Packages | `@yassinos-coder/nestjs-shield` | automatic `GITHUB_TOKEN` |

To use the GitHub Packages build, map the scope in a project `.npmrc`:

```ini
@yassinos-coder:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Manual publish from a machine: `npm login`, then `npm publish --access public`.

## License

MIT
