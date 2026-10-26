import { Inject, Injectable } from '@nestjs/common';
import { AutoBanCheck } from './checks/auto-ban.check';
import { KEY_BAN, SHIELD_CONFIG, SHIELD_STORAGE } from './shield.constants';
import type { AnyRequest, ShieldBanList, ShieldConfig } from './shield.types';
import type { ShieldStorage } from './storage/shield-storage.interface';
import { EventUtil } from './utils/event.util';
import { IpUtil } from './utils/ip.util';

const MAX_BAN_SCAN = 1_000;

@Injectable()
export class ShieldService {
  constructor(
    @Inject(SHIELD_CONFIG) private readonly config: ShieldConfig,
    @Inject(SHIELD_STORAGE) private readonly storage: ShieldStorage,
  ) {}

  resolveIp(req: AnyRequest): string {
    return this.config.ipResolver
      ? this.config.ipResolver(req)
      : IpUtil.resolve(req, this.config.trustProxy, this.config.ipHeader);
  }

  async isBanned(ip: string): Promise<boolean> {
    const raw = await this.storage.get(`${KEY_BAN}:${ip}`);
    return raw !== null && Number(raw) > Date.now();
  }

  async listBans(): Promise<ShieldBanList> {
    if (typeof this.storage.scan !== 'function') return { supported: false, bans: [] };
    const keys = await this.storage.scan(`${KEY_BAN}:`, MAX_BAN_SCAN);
    const bans: ShieldBanList['bans'] = [];
    for (const key of keys) {
      const raw = await this.storage.get(key);
      const expiresAt = Number(raw);
      if (!raw || !(expiresAt > Date.now())) continue;
      bans.push({ ip: key.slice(KEY_BAN.length + 1), expiresAt });
    }
    bans.sort((a, b) => a.expiresAt - b.expiresAt);
    return { supported: true, bans };
  }

  async ban(ip: string, durationMs: number): Promise<void> {
    await this.storage.set(`${KEY_BAN}:${ip}`, String(Date.now() + durationMs), durationMs);
    EventUtil.emit(this.config.onEvent, { type: 'ban', at: Date.now(), ip, durationMs, source: 'manual' });
  }

  async unban(ip: string): Promise<void> {
    await this.storage.delete(`${KEY_BAN}:${ip}`);
    EventUtil.emit(this.config.onEvent, { type: 'unban', at: Date.now(), ip });
  }

  async recordViolation(ip: string, source: 'auto' | 'probe' = 'auto'): Promise<boolean> {
    const durationMs = await AutoBanCheck.recordViolation(this.storage, ip, this.config.autoBan);
    if (durationMs === null) return false;
    EventUtil.emit(this.config.onEvent, { type: 'ban', at: Date.now(), ip, durationMs, source });
    return true;
  }
}
