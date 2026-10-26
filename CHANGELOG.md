# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-10-26

### Added

- Redesigned admin dashboard: Overview, Controls and Live traffic tabs, KPI cards with sparklines, a 30-minute traffic chart, blocked-by-layer bars, a response-status donut, top paths and top clients (with one-click ban), latency p50/p95, toast feedback, and a light/dark theme toggle. Works on phones.
- `ShieldModule.forEnv()`: zero-config setup from `SHIELD_*` environment variables (limit, window, algorithm, auto-ban, burst, body size, proxy, probes, skip paths) and `REDIS_URL`.
- `trustProxy: 'cloudflare'` (Cloudflare, Railway, Render) and `ipHeader` for platforms with their own client-IP header. A one-time warning is logged when requests arrive through a proxy with `trustProxy` unset.
- `storage: { type: 'redis', url }`: the library creates and closes the Redis connection. Redis failures now fail open to in-memory counters (opt out with `failOpen: false`).
- `ShieldService`, a public injectable API: `ban`, `unban`, `isBanned`, `listBans`, `recordViolation`, `resolveIp`. Key constants (`KEY_BAN`, ...) are exported, so deep imports from `dist` are no longer needed.
- `skipPaths` option; health checks (`/health`, `/healthz`, `/livez`, `/readyz`, `/api/health`) are skipped by default.
- `probes` option: requests to scanner paths (`/.env`, `/wp-login.php`, ...) that match no route now count toward auto-ban (Express adapter).
- `rules.load`: load whitelist and blacklist from a database or API and keep them refreshed, merged with the static lists.
- `banStorage`: keep bans in a different store than counters, to share bans between services.
- `onEvent` hook for `reject`, `ban` and `unban` events (audit logs, metrics).
- `ShieldAdmin.isAdminRequest(req)` for custom guards, and the dashboard controller is marked public under the common metadata keys so global auth guards let its own login through.

### Changed

- README rewritten: quick start first, proxy setup, layer overview, full option reference, recipes, dashboard guide and troubleshooting. Public config options now carry editor doc comments.
- Dashboard stats now include per-minute 4xx/5xx counts and latency, top paths and clients, and latency percentiles (from the last 500 requests).
- Storage creation is shared by `ShieldModule` and `Shield.applyTo`; the module's provider setup is consolidated.

## [1.2.1] - 2026-10-05

### Fixed

- The admin dashboard now works behind `app.setGlobalPrefix` (e.g. `/api/shield/admin`): the session cookie is scoped to the actual mount path instead of a hard-coded `/shield/admin`, and the request feed ignores dashboard traffic under any prefix.
- README no longer recommends the Express 4 `shield/admin(.*)` exclude pattern, which crashes NestJS 11 / path-to-regexp v8 at startup.

## [1.2.0] - 2026-10-05

### Added

- Admin dashboard at `/shield/admin`, enabled with `SHIELD_DASH=true` and protected by `SHIELD_ADMIN_USER` / `SHIELD_ADMIN_PASSWORD` from the environment. Without credentials the page shows a configuration error and login is disabled.
- Dashboard controls: shield on/off, under attack mode, rate limit, auto-ban, whitelist and blacklist editing, manual IP bans, and a live feed of requests with the shield decision, response status and latency. Overrides are persisted in shield storage.
- `admin` option on `ShieldConfig` (`attackModeFactor`, `maxEvents`).
- Optional `scan(prefix, limit)` on `ShieldStorage`, implemented by `MemoryStorage` and `RedisStorage`.

### Changed

- Manually set `shield:ban:*` entries are enforced even when `autoBan` is not configured, while the dashboard is enabled.

## [1.1.0] - 2026-08-29

### Added

- Added peer and build compatibility with NestJS 12 while retaining NestJS 9–11 support.

### Performance

- Reduced Redis fixed-window checks from up to three sequential round trips to one atomic Lua call.
- Reduced Redis burst acquire/release bookkeeping to one atomic Lua call per operation.

## [1.0.1] - 2026-05-28

### Added

- Startup banner — `ShieldModule.onApplicationBootstrap` now prints an ASCII banner ("nestjs-shield vX.Y.Z — up and running") followed by a `[Shield]` summary log via NestJS `Logger` listing the active storage backend, rate-limit policy, and enabled layers. The banner also fires from `Shield.applyTo(app, cfg)` when used standalone in `main.ts`. Only one banner is printed per process even when both entry points are used together. Suppressed when `config.enabled` is `false`.
- `AutoBanConfig.maxBanDuration` — optional ms cap on escalated ban durations. When set, the `banDuration * 2^N` exponential growth is clipped to this ceiling.

### Changed

- Aligned Redis `increment` window semantics with Memory storage. Previously Redis refreshed the TTL on every increment (last-hit window), while Memory only set TTL on the first hit (first-hit window). Both backends now use first-hit semantics via an atomic Lua script. This is the standard rate-limit window behavior and affects auto-ban violation counters and slow-down hit counters.

### Fixed

- Burst counter could remain incremented if the engine threw between `BurstCheck` and the final return. Post-burst checks are now wrapped in try/catch so the release runs on any error before the exception propagates.
- Auto-ban escalation exponent is now clamped to 30 (`2^30`), preventing `Math.pow(2, count - 1)` from overflowing to `Infinity` under prolonged sustained attack scenarios.

## [1.0.0] - 2026-05-28

### Added

- Initial public release of `nestjs-shield` — layered API protection for NestJS in a single drop-in module.
- Rate limiting with five algorithms: token bucket (default), sliding-window counter, sliding-window log, fixed window, and leaky bucket.
- IP allow / block lists with full CIDR support (IPv4 + IPv6) via `ipaddr.js`.
- Auto-ban that escalates repeat offenders to a temporary block, with optional exponential duration growth.
- Slow-down progressive delay that softens approach to the hard rate-limit cliff.
- User-Agent filtering with block patterns, allow patterns, and require-present mode.
- Burst protection: per-IP concurrent-in-flight cap (auto-released on response).
- Payload limits: body byte cap (via `Content-Length`) and header byte cap.
- Pluggable storage layer with two built-in adapters: `MemoryStorage` (LRU-capped, per-process) and `RedisStorage` (atomic Lua scripts via `defineCommand`, race-free across pods).
- Two entry points sharing one config: `ShieldModule.forRoot` / `ShieldModule.forRootAsync` (registers a global `APP_GUARD`) and `Shield.applyTo(app, cfg)` (Express middleware for `main.ts`).
- Decorator set for per-route overrides: `@RateLimit`, `@SkipShield`, `@Blacklist`, `@Whitelist`, `@SlowDown`, `@MaxPayload`, `@BurstLimit`, `@UserAgentPolicy`.
- Standard rate-limit headers — RFC draft-7 by default, draft-6 (`X-RateLimit-*`) opt-in, with `Retry-After` on 429.
- Observability `response.onReject` hook invoked on every rejection with `{ layer, ip, reason, status, retryAfterMs }`.
- Typed exceptions: `ShieldRateLimitException`, `ShieldBlockedException`, `ShieldPayloadException`.
- Runnable example NestJS app under `example/` demonstrating every feature and decorator.
- README with full configuration reference, algorithm comparison table, and storage adapter recipes.
