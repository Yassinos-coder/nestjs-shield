import { Logger } from '@nestjs/common';
import { ShieldEngine } from './shield.engine';
import { createShieldMiddleware } from './shield.middleware';
import { SHIELD_ENGINE } from './shield.constants';
import type { ShieldConfig, StorageOption } from './shield.types';
import { MemoryStorage } from './storage/memory.storage';
import { RedisStorage } from './storage/redis.storage';
import type { ShieldStorage } from './storage/shield-storage.interface';
import { BannerUtil } from './utils/banner.util';

export interface NestAppLike {
  use: (...handlers: unknown[]) => unknown;
  get?: <T = unknown>(token: unknown) => T;
}

function buildStorage(option: StorageOption | undefined): ShieldStorage {
  if (!option || option === 'memory') return new MemoryStorage();
  if (typeof option === 'object' && 'type' in option) {
    if (option.type === 'memory') return new MemoryStorage({ maxKeys: option.maxKeys });
    if (option.type === 'redis') {
      return new RedisStorage({
        client: option.client as ConstructorParameters<typeof RedisStorage>[0]['client'],
        keyPrefix: option.keyPrefix,
      });
    }
  }
  return option as ShieldStorage;
}

export class Shield {
  static applyTo(app: NestAppLike, config: ShieldConfig = {}): void {
    let engine: ShieldEngine | null = null;
    let resolvedConfig: ShieldConfig = config;
    if (typeof app.get === 'function') {
      try {
        engine = app.get<ShieldEngine>(SHIELD_ENGINE);
        resolvedConfig = engine.getConfig();
      } catch {
        engine = null;
      }
    }
    if (!engine) {
      const storage = buildStorage(config.storage);
      engine = new ShieldEngine(config, storage);
    }
    app.use(createShieldMiddleware(engine));

    if (resolvedConfig.enabled !== false && engine.markBannerShown()) {
      const { banner, summary } = BannerUtil.build(resolvedConfig);
      process.stdout.write(banner + '\n');
      new Logger('Shield').log(summary);
    }
  }
}
