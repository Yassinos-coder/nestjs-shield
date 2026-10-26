import type { RedisStorageOption, ShieldConfig, StorageOption } from '../shield.types';
import { MemoryStorage } from './memory.storage';
import { RedisStorage } from './redis.storage';
import { ResilientStorage } from './resilient.storage';
import type { ShieldStorage } from './shield-storage.interface';
import { SplitBanStorage } from './split-ban.storage';

type RedisClient = ConstructorParameters<typeof RedisStorage>[0]['client'];
type RedisConstructor = new (url: string, options?: Record<string, unknown>) => unknown;

export class StorageFactory {
  static build(config: ShieldConfig): ShieldStorage {
    const main = StorageFactory.fromOption(config.storage);
    if (!config.banStorage) return main;
    return new SplitBanStorage(main, StorageFactory.fromOption(config.banStorage));
  }

  private static fromOption(option: StorageOption | undefined): ShieldStorage {
    if (!option || option === 'memory') return new MemoryStorage();
    if (typeof option === 'object' && 'type' in option) {
      if (option.type === 'memory') return new MemoryStorage({ maxKeys: option.maxKeys });
      return StorageFactory.redis(option);
    }
    return option as ShieldStorage;
  }

  private static redis(option: RedisStorageOption): ShieldStorage {
    const owned = option.client === undefined;
    const client = (owned ? StorageFactory.connect(option.url) : option.client) as RedisClient;
    const storage = new RedisStorage({ client, keyPrefix: option.keyPrefix });
    return new ResilientStorage(storage, {
      failOpen: option.failOpen !== false,
      onDispose: owned ? () => StorageFactory.quit(client) : undefined,
    });
  }

  private static connect(url: string | undefined): unknown {
    if (!url) throw new Error('nestjs-shield: storage.type "redis" needs either `url` or `client`');
    const Redis = StorageFactory.loadRedis();
    const client = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false }) as {
      on?: (event: string, listener: () => void) => void;
    };
    client.on?.('error', () => undefined);
    return client;
  }

  private static loadRedis(): RedisConstructor {
    try {
      const mod = require('ioredis') as { default?: unknown };
      return (mod.default ?? mod) as RedisConstructor;
    } catch {
      throw new Error('nestjs-shield: `storage.url` needs the ioredis package. Run `npm install ioredis`.');
    }
  }

  private static async quit(client: unknown): Promise<void> {
    await (client as { quit?: () => Promise<unknown> }).quit?.().catch(() => undefined);
  }
}
