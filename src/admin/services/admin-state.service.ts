import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SHIELD_CONFIG, SHIELD_STORAGE } from '../../shield.constants';
import { ShieldService } from '../../shield.service';
import type { ShieldConfig } from '../../shield.types';
import type { ShieldStorage } from '../../storage/shield-storage.interface';
import {
  DEFAULT_ATTACK_FACTOR,
  KEY_ADMIN_OVERRIDES,
  OVERRIDES_REFRESH_MS,
  OVERRIDES_TTL_MS,
} from '../constants/admin.constants';
import type {
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
    private readonly shield: ShieldService,
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

  listBans(): Promise<AdminBanList> {
    return this.shield.listBans();
  }

  ban(ip: string, minutes: number): Promise<void> {
    return this.shield.ban(ip, minutes * 60_000);
  }

  unban(ip: string): Promise<void> {
    return this.shield.unban(ip);
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
