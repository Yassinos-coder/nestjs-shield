import {
  DynamicModule,
  Inject,
  Logger,
  Module,
  ModuleMetadata,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
  Provider,
  Type,
} from '@nestjs/common';
import { APP_GUARD, HttpAdapterHost, Reflector } from '@nestjs/core';
import { ADMIN_PROVIDERS } from './admin/admin.providers';
import { AdminEnvValidator } from './admin/validators/admin-env.validator';
import { SHIELD_RUNTIME } from './admin/constants/admin.constants';
import { ShieldAdminController } from './admin/controllers/shield-admin.controller';
import type { ShieldRuntime } from './admin/interfaces';
import { SHIELD_CONFIG, SHIELD_ENGINE, SHIELD_STORAGE } from './shield.constants';
import { ShieldEngine } from './shield.engine';
import { ShieldGuard } from './shield.guard';
import { EnvConfig } from './config/env-config';
import { createProbeMiddleware } from './probes/probe.middleware';
import { RulesSyncService } from './rules/rules-sync.service';
import { ShieldService } from './shield.service';
import type { ShieldConfig } from './shield.types';
import type { ShieldStorage } from './storage/shield-storage.interface';
import { StorageFactory } from './storage/storage.factory';
import { BannerUtil } from './utils/banner.util';

export interface ShieldAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: unknown[]) => Promise<ShieldConfig> | ShieldConfig;
  inject?: (string | symbol | Type<unknown>)[];
}

interface ExpressLike {
  use?: (handler: unknown) => unknown;
}

@Module({})
export class ShieldModule implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('Shield');

  constructor(
    @Inject(SHIELD_STORAGE) private readonly storage: ShieldStorage,
    @Inject(SHIELD_CONFIG) private readonly config: ShieldConfig,
    @Inject(SHIELD_ENGINE) private readonly engine: ShieldEngine,
    private readonly service: ShieldService,
    @Optional() private readonly adapterHost?: HttpAdapterHost,
  ) {}

  onModuleInit(): void {
    this.registerProbes();
  }

  onApplicationBootstrap(): void {
    if (this.config.enabled === false) return;
    if (!this.engine.markBannerShown()) return;
    const { banner, summary } = BannerUtil.build(this.config);
    process.stdout.write(`${banner}\n`);
    this.logger.log(summary);
    if (AdminEnvValidator.isEnabled()) this.logger.log('Admin dashboard enabled at /shield/admin');
  }

  /** Zero-config setup: reads every `SHIELD_*` variable (and `REDIS_URL`) from the environment. See the README. */
  static forEnv(overrides: ShieldConfig = {}): DynamicModule {
    return ShieldModule.forRoot(EnvConfig.build(process.env, overrides));
  }

  static forRoot(config: ShieldConfig = {}): DynamicModule {
    return {
      module: ShieldModule,
      global: true,
      controllers: [ShieldAdminController],
      providers: [
        { provide: SHIELD_CONFIG, useValue: config },
        { provide: SHIELD_STORAGE, useFactory: () => StorageFactory.build(config) },
        ...ShieldModule.coreProviders(),
      ],
      exports: ShieldModule.exportedTokens(),
    };
  }

  static forRootAsync(options: ShieldAsyncOptions): DynamicModule {
    return {
      module: ShieldModule,
      global: true,
      imports: options.imports ?? [],
      controllers: [ShieldAdminController],
      providers: [
        { provide: SHIELD_CONFIG, useFactory: options.useFactory, inject: options.inject ?? [] },
        { provide: SHIELD_STORAGE, useFactory: (cfg: ShieldConfig) => StorageFactory.build(cfg), inject: [SHIELD_CONFIG] },
        ...ShieldModule.coreProviders(),
      ],
      exports: ShieldModule.exportedTokens(),
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.storage?.dispose) await this.storage.dispose();
  }

  private static coreProviders(): Provider[] {
    return [
      Reflector,
      ShieldService,
      RulesSyncService,
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
  }

  private static exportedTokens(): (string | typeof ShieldGuard | typeof ShieldService)[] {
    return [SHIELD_CONFIG, SHIELD_STORAGE, SHIELD_ENGINE, ShieldGuard, ShieldService];
  }

  private registerProbes(): void {
    const probes = this.config.probes;
    if (!probes || this.config.enabled === false) return;
    if (!this.config.autoBan) {
      this.logger.warn('`probes` has no effect without `autoBan`; scanner hits would be counted but never banned');
      return;
    }
    const instance = this.adapterHost?.httpAdapter?.getInstance?.() as ExpressLike | undefined;
    if (typeof instance?.use !== 'function') {
      this.logger.warn('`probes` needs the Express adapter; it was skipped');
      return;
    }
    instance.use(createProbeMiddleware(this.service, probes));
  }
}
