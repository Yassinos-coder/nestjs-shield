import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SHIELD_CONFIG } from '../shield.constants';
import type { IpListConfig, ShieldConfig } from '../shield.types';

const DEFAULT_REFRESH_MS = 30_000;

@Injectable()
export class RulesSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('ShieldRules');
  private readonly baseWhitelist: IpListConfig | undefined;
  private readonly baseBlacklist: ShieldConfig['blacklist'];
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject(SHIELD_CONFIG) private readonly config: ShieldConfig) {
    this.baseWhitelist = config.whitelist;
    this.baseBlacklist = config.blacklist;
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.rules) return;
    await this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.config.rules.refreshMs ?? DEFAULT_REFRESH_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async refresh(): Promise<void> {
    if (!this.config.rules) return;
    try {
      const loaded = await this.config.rules.load();
      this.config.whitelist = this.merge(this.baseWhitelist, loaded.whitelist);
      this.config.blacklist = { ...this.baseBlacklist, ...this.merge(this.baseBlacklist, loaded.blacklist) };
    } catch (error) {
      this.logger.warn(`Could not reload address rules, keeping the last ones: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private merge(base: IpListConfig | undefined, loaded: IpListConfig | undefined): IpListConfig {
    return {
      ips: [...(base?.ips ?? []), ...(loaded?.ips ?? [])],
      cidrs: [...(base?.cidrs ?? []), ...(loaded?.cidrs ?? [])],
    };
  }
}
