import { Inject, Injectable } from '@nestjs/common';
import { SHIELD_CONFIG } from '../../shield.constants';
import type { AnyRequest, AnyResponse, ShieldConfig } from '../../shield.types';
import {
  DEFAULT_MAX_EVENTS,
  MAX_EVENTS_PER_POLL,
  MAX_PATH_LENGTH,
  MAX_UA_LENGTH,
  STATS_MINUTES,
  TOP_ENTRIES,
} from '../constants/admin.constants';
import type {
  AdminDecision,
  AdminEvent,
  AdminLatency,
  AdminMinuteBucket,
  AdminStats,
  AdminTopEntry,
} from '../interfaces';
import { AdminHttpUtil } from '../utils/admin-http.util';
import { AdminRequestValidator } from '../validators/admin-request.validator';

@Injectable()
export class RequestLogService {
  private readonly events: AdminEvent[] = [];
  private readonly seen = new WeakSet<object>();
  private readonly maxEvents: number;
  private readonly byLayer: Record<string, number> = {};
  private readonly byStatusClass: Record<string, number> = {};
  private readonly minutes = new Map<number, AdminMinuteBucket>();
  private nextId = 1;
  private total = 0;
  private allowed = 0;
  private rejected = 0;

  constructor(@Inject(SHIELD_CONFIG) config: ShieldConfig) {
    this.maxEvents = config.admin?.maxEvents ?? DEFAULT_MAX_EVENTS;
  }

  record(req: AnyRequest, res: AnyResponse, decision: AdminDecision): void {
    try {
      this.capture(req, res, decision);
    } catch {
      // the live feed must never break request handling
    }
  }

  getEvents(since: number): AdminEvent[] {
    const fresh = this.events.filter((event) => event.id > since);
    return fresh.slice(-MAX_EVENTS_PER_POLL);
  }

  getStats(): AdminStats {
    return {
      total: this.total,
      allowed: this.allowed,
      rejected: this.rejected,
      byLayer: { ...this.byLayer },
      byStatusClass: { ...this.byStatusClass },
      minutes: this.collectMinutes(),
      topPaths: this.top((event) => event.path),
      topIps: this.top((event) => event.ip),
      latency: this.latency(),
    };
  }

  private capture(req: AnyRequest, res: AnyResponse, decision: AdminDecision): void {
    if (this.seen.has(req)) return;
    this.seen.add(req);
    if (AdminRequestValidator.isAdminPath(req.url)) return;

    const startedAt = Date.now();
    const event: AdminEvent = {
      id: this.nextId++,
      at: startedAt,
      ip: decision.ip,
      method: req.method ?? 'GET',
      path: (req.url ?? '/').split('?')[0].slice(0, MAX_PATH_LENGTH),
      userAgent: AdminHttpUtil.header(req, 'user-agent').slice(0, MAX_UA_LENGTH),
      allowed: decision.allowed,
      layer: decision.layer,
      reason: decision.reason,
      status: decision.status,
    };

    this.push(event);
    this.countDecision(event);

    if (typeof res.on !== 'function') {
      this.countStatus(event);
      return;
    }
    res.on('finish', () => {
      event.status = res.statusCode ?? event.status;
      event.durationMs = Date.now() - startedAt;
      this.countStatus(event);
    });
  }

  private push(event: AdminEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.shift();
  }

  private countDecision(event: AdminEvent): void {
    this.total += 1;
    if (event.allowed) this.allowed += 1;
    else this.rejected += 1;
    if (!event.allowed && event.layer) {
      this.byLayer[event.layer] = (this.byLayer[event.layer] ?? 0) + 1;
    }

    const minute = Math.floor(event.at / 60_000);
    const bucket = this.minutes.get(minute) ?? this.emptyBucket(minute);
    bucket.total += 1;
    if (!event.allowed) bucket.rejected += 1;
    this.minutes.set(minute, bucket);
    this.pruneMinutes(minute);
  }

  private countStatus(event: AdminEvent): void {
    const status = event.status;
    if (!status) return;
    const key = `${Math.floor(status / 100)}xx`;
    this.byStatusClass[key] = (this.byStatusClass[key] ?? 0) + 1;

    const bucket = this.minutes.get(Math.floor(event.at / 60_000));
    if (!bucket) return;
    if (status >= 500) bucket.serverErrors += 1;
    else if (status >= 400) bucket.clientErrors += 1;
    if (event.durationMs !== undefined) {
      bucket.latencySum += event.durationMs;
      bucket.latencyCount += 1;
    }
  }

  private pruneMinutes(current: number): void {
    for (const minute of this.minutes.keys()) {
      if (minute > current - STATS_MINUTES) break;
      this.minutes.delete(minute);
    }
  }

  private collectMinutes(): AdminMinuteBucket[] {
    const current = Math.floor(Date.now() / 60_000);
    const out: AdminMinuteBucket[] = [];
    for (let minute = current - STATS_MINUTES + 1; minute <= current; minute++) {
      out.push(this.minutes.get(minute) ?? this.emptyBucket(minute));
    }
    return out;
  }

  private emptyBucket(minute: number): AdminMinuteBucket {
    return { minute, total: 0, rejected: 0, clientErrors: 0, serverErrors: 0, latencySum: 0, latencyCount: 0 };
  }

  private top(keyOf: (event: AdminEvent) => string): AdminTopEntry[] {
    const entries = new Map<string, AdminTopEntry>();
    for (const event of this.events) {
      const key = keyOf(event);
      const entry = entries.get(key) ?? { key, count: 0, rejected: 0 };
      entry.count += 1;
      if (!event.allowed) entry.rejected += 1;
      entries.set(key, entry);
    }
    return [...entries.values()].sort((a, b) => b.count - a.count).slice(0, TOP_ENTRIES);
  }

  private latency(): AdminLatency {
    const samples = this.events
      .map((event) => event.durationMs)
      .filter((value): value is number => value !== undefined)
      .sort((a, b) => a - b);
    if (!samples.length) return { samples: 0, avg: 0, p50: 0, p95: 0, max: 0 };
    const at = (ratio: number): number => samples[Math.min(samples.length - 1, Math.floor(samples.length * ratio))];
    const sum = samples.reduce((total, value) => total + value, 0);
    return {
      samples: samples.length,
      avg: Math.round(sum / samples.length),
      p50: at(0.5),
      p95: at(0.95),
      max: samples[samples.length - 1],
    };
  }
}
