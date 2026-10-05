import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SHIELD_CONFIG, SHIELD_STORAGE, KEY_BAN } from '../../shield.constants';
import type { ShieldConfig } from '../../shield.types';
import type { ShieldStorage } from '../../storage/shield-storage.interface';
import {
  DEFAULT_ATTACK_FACTOR,
  KEY_ADMIN_OVERRIDES,
  MAX_BAN_SCAN,
  OVERRIDES_REFRESH_MS,
  OVERRIDES_TTL_MS,
} from '../constants/admin.constants';
import type {
  AdminBan,
  AdminBanList,
  AdminOverrides,
  AdminSettings,
  AdminSnapshot,
  AdminStats,
} from '../interfaces';
import { AdminConfigMapper } from '../mappers/admin-config.mapper';
import { AdminEnvValidator } from '../validators/admin-env.validator';

@Injectable()
export class AdminStateService implements OnModuleInit {
  private readonly logger = new Logger('ShieldAdmin');
  private readonly startedAt = Date.now();
  private overrides: AdminOverrides = {};
  private serialized = '{}';
  private lastRefresh = 0;
  private refreshing = false;
  private cache: { base: ShieldConfig; serialized: string; result: ShieldConfig } | null = null;

  constructor(
    @Inject(SHIELD_CONFIG) private readonly config: ShieldConfig,
    @Inject(SHIELD_STORAGE) private readonly storage: ShieldStorage,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!AdminEnvValidator.isEnabled()) return;
    await this.refresh();
  }

  isActive(): boolean {
    return AdminEnvValidator.isEnabled();
  }

  effectiveConfig(base: ShieldConfig): ShieldConfig {
    if (Date.now() - this.lastRefresh > OVERRIDES_REFRESH_MS) void this.refresh();
    if (this.cache && this.cache.base === base && this.cache.serialized === this.serialized) {
      return this.cache.result;
    }
    const result = AdminConfigMapper.toEffective(base, this.overrides, this.attackFactor());
    this.cache = { base, serialized: this.serialized, result };
    return result;
  }

  getSnapshot(stats: AdminStats): AdminSnapshot {
    const effective = this.effectiveConfig(this.config);
    return {
      version: this.version(),
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      storage: this.storageLabel(),
      enabled: effective.enabled !== false,
      attackMode: this.overrides.attackMode === true,
      attackModeFactor: this.attackFactor(),
      settings: this.getSettings(),
      effective: { rateLimit: AdminConfigMapper.effectiveRateLimit(effective) },
      stats,
    };
  }

  getSettings(): AdminSettings {
    return AdminConfigMapper.toSettings(this.config, this.overrides);
  }

  async listBans(): Promise<AdminBanList> {
    if (typeof this.storage.scan !== 'function') return { supported: false, bans: [] };
    const keys = await this.storage.scan(`${KEY_BAN}:`, MAX_BAN_SCAN);
    const bans: AdminBan[] = [];
    for (const key of keys) {
      const raw = await this.storage.get(key);
      const expiresAt = Number(raw);
      if (!raw || !(expiresAt > Date.now())) continue;
      bans.push({ ip: key.slice(KEY_BAN.length + 1), expiresAt });
    }
    bans.sort((a, b) => a.expiresAt - b.expiresAt);
    return { supported: true, bans };
  }

  async ban(ip: string, minutes: number): Promise<void> {
    const ttlMs = minutes * 60_000;
    await this.storage.set(`${KEY_BAN}:${ip}`, String(Date.now() + ttlMs), ttlMs);
  }

  async unban(ip: string): Promise<void> {
    await this.storage.delete(`${KEY_BAN}:${ip}`);
  }

  async update(patch: AdminOverrides): Promise<void> {
    await this.refresh();
    await this.save({ ...this.overrides, ...patch });
  }

  async reset(): Promise<void> {
    await this.save({});
  }

  private async save(next: AdminOverrides): Promise<void> {
    const serialized = JSON.stringify(next);
    await this.storage.set(KEY_ADMIN_OVERRIDES, serialized, OVERRIDES_TTL_MS);
    this.apply(serialized);
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    this.lastRefresh = Date.now();
    try {
      const raw = await this.storage.get(KEY_ADMIN_OVERRIDES);
      this.apply(raw ?? '{}');
    } catch (err) {
      this.logger.warn(`Could not load dashboard overrides: ${(err as Error).message}`);
    } finally {
      this.refreshing = false;
    }
  }

  private apply(serialized: string): void {
    if (serialized === this.serialized) return;
    try {
      this.overrides = JSON.parse(serialized) as AdminOverrides;
      this.serialized = serialized;
    } catch {
      this.logger.warn('Ignoring unreadable dashboard overrides');
    }
  }

  private attackFactor(): number {
    const factor = this.config.admin?.attackModeFactor;
    return factor && factor > 1 ? factor : DEFAULT_ATTACK_FACTOR;
  }

  private storageLabel(): string {
    const storage = this.config.storage;
    if (!storage || storage === 'memory') return 'memory';
    if (typeof storage === 'object' && 'type' in storage) return storage.type;
    return 'custom';
  }

  private version(): string {
    try {
      const pkg = require('../../../package.json') as { version?: string };
      return pkg.version ?? '?';
    } catch {
      return '?';
    }
  }
}
