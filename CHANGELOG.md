# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
