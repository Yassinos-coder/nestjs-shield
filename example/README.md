# nestjs-shield example

Minimal NestJS app showing every feature of `nestjs-shield` in one place.

```bash
# from the package root, first:
npm install
npm run build

# then:
cd example
npm install
npm run start:dev
```

App listens on `http://localhost:3000`. Routes:

| Route | What it shows |
| --- | --- |
| `GET  /demo` | Global config — 60 rpm token bucket per IP, blacklist 10.10.10.10, slow-down after 30 hits, etc. |
| `GET  /demo/strict` | Per-route override → sliding-window-log, 5 req / 10s |
| `GET  /demo/slow` | Per-route slow-down → +500ms each hit after the 2nd |
| `GET  /demo/strict-ua` | Blocks `curl` and `python-requests`, requires UA header |
| `POST /demo/upload` | Per-route 16 KB body cap |
| `GET  /demo/burst-light` | Max 2 concurrent in-flight per IP |
| `GET  /demo/vip` | Per-route whitelist (CIDR) |
| `GET  /demo/blocked-net` | Per-route additional blacklist (CIDR) |
| `GET  /demo/skipped` | `@SkipShield()` bypasses everything |
| `GET  /demo/skip-rate-limit-only` | `@SkipShield('rate-limit')` skips only the rate limiter |

Try it:

```bash
# blast the default route, watch RateLimit-Remaining drop, then 429
for i in $(seq 1 70); do curl -s -o /dev/null -w "%{http_code} " localhost:3000/demo; done

# UA rejection
curl -i localhost:3000/demo/strict-ua    # 403, curl UA blocked

# strict route 429
for i in $(seq 1 10); do curl -s -o /dev/null -w "%{http_code} " localhost:3000/demo/strict; done

# auto-ban after repeated 429s on the strict route
```

Switch the storage to Redis by editing `src/app.module.ts`:

```ts
import Redis from 'ioredis';

ShieldModule.forRoot({
  storage: { type: 'redis', client: new Redis(), keyPrefix: 'demo' },
  // ...
});
```
