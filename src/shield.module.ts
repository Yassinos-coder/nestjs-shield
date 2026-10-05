import {
  DynamicModule,
  Inject,
  Logger,
  Module,
  ModuleMetadata,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Provider,
  Type,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ADMIN_PROVIDERS } from './admin/admin.providers';
import { AdminEnvValidator } from './admin/validators/admin-env.validator';
import { SHIELD_RUNTIME } from './admin/constants/admin.constants';
import { ShieldAdminController } from './admin/controllers/shield-admin.controller';
import type { ShieldRuntime } from './admin/interfaces';
import { SHIELD_CONFIG, SHIELD_ENGINE, SHIELD_STORAGE } from './shield.constants';
import { ShieldEngine } from './shield.engine';
import { ShieldGuard } from './shield.guard';
import type { ShieldConfig, StorageOption } from './shield.types';
import { MemoryStorage } from './storage/memory.storage';
import { RedisStorage } from './storage/redis.storage';
import type { ShieldStorage } from './storage/shield-storage.interface';
import { BannerUtil } from './utils/banner.util';

export interface ShieldAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: unknown[]) => Promise<ShieldConfig> | ShieldConfig;
  inject?: (string | symbol | Type<unknown>)[];
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

@Module({})
export class ShieldModule implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('Shield');

  constructor(
    @Inject(SHIELD_STORAGE) private readonly storage: ShieldStorage,
    @Inject(SHIELD_CONFIG) private readonly config: ShieldConfig,
    @Inject(SHIELD_ENGINE) private readonly engine: ShieldEngine,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.enabled === false) return;
    if (!this.engine.markBannerShown()) return;
    const { banner, summary } = BannerUtil.build(this.config);
    process.stdout.write(banner + '\n');
    this.logger.log(summary);
    if (AdminEnvValidator.isEnabled()) this.logger.log('Admin dashboard enabled at /shield/admin');
  }

  static forRoot(config: ShieldConfig = {}): DynamicModule {
    const providers: Provider[] = [
      { provide: SHIELD_CONFIG, useValue: config },
      {
        provide: SHIELD_STORAGE,
        useFactory: () => buildStorage(config.storage),
      },
      Reflector,
      ...ADMIN_PROVIDERS,
      {
        provide: SHIELD_ENGINE,
        useFactory: (cfg: ShieldConfig, storage: ShieldStorage, runtime: ShieldRuntime) =>
          new ShieldEngine(cfg, storage, runtime),
        inject: [SHIELD_CONFIG, SHIELD_STORAGE, SHIELD_RUNTIME],
      },
      ShieldGuard,
      { provide: APP_GUARD, useExisting: ShieldGuard },
    ];

    return {
      module: ShieldModule,
      global: true,
      controllers: [ShieldAdminController],
      providers,
      exports: [SHIELD_CONFIG, SHIELD_STORAGE, SHIELD_ENGINE, ShieldGuard],
    };
  }

  static forRootAsync(options: ShieldAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: SHIELD_CONFIG,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      {
        provide: SHIELD_STORAGE,
        useFactory: (cfg: ShieldConfig) => buildStorage(cfg.storage),
        inject: [SHIELD_CONFIG],
      },
      Reflector,
      ...ADMIN_PROVIDERS,
      {
        provide: SHIELD_ENGINE,
        useFactory: (cfg: ShieldConfig, storage: ShieldStorage, runtime: ShieldRuntime) =>
          new ShieldEngine(cfg, storage, runtime),
        inject: [SHIELD_CONFIG, SHIELD_STORAGE, SHIELD_RUNTIME],
      },
      ShieldGuard,
      { provide: APP_GUARD, useExisting: ShieldGuard },
    ];

    return {
      module: ShieldModule,
      global: true,
      imports: options.imports ?? [],
      controllers: [ShieldAdminController],
      providers,
      exports: [SHIELD_CONFIG, SHIELD_STORAGE, SHIELD_ENGINE, ShieldGuard],
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.storage?.dispose) await this.storage.dispose();
  }
}
