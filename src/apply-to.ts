import { Logger } from '@nestjs/common';
import { ShieldEngine } from './shield.engine';
import { createShieldMiddleware } from './shield.middleware';
import { SHIELD_ENGINE } from './shield.constants';
import type { ShieldConfig } from './shield.types';
import { StorageFactory } from './storage/storage.factory';
import { BannerUtil } from './utils/banner.util';

export interface NestAppLike {
  use: (...handlers: unknown[]) => unknown;
  get?: <T = unknown>(token: unknown) => T;
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
      const storage = StorageFactory.build(config);
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
