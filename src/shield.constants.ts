export const SHIELD_CONFIG = 'SHIELD_CONFIG';
export const SHIELD_STORAGE = 'SHIELD_STORAGE';
export const SHIELD_ENGINE = 'SHIELD_ENGINE';

export const META_RATE_LIMIT = 'shield:rate-limit';
export const META_SKIP = 'shield:skip';
export const META_BLACKLIST = 'shield:blacklist';
export const META_WHITELIST = 'shield:whitelist';
export const META_SLOW_DOWN = 'shield:slow-down';
export const META_MAX_PAYLOAD = 'shield:max-payload';
export const META_BURST = 'shield:burst';
export const META_UA = 'shield:user-agent';

export const KEY_PREFIX = 'shield';
export const KEY_RATE_LIMIT = `${KEY_PREFIX}:rl`;
export const KEY_VIOLATIONS = `${KEY_PREFIX}:violations`;
export const KEY_BAN = `${KEY_PREFIX}:ban`;
export const KEY_BAN_COUNT = `${KEY_PREFIX}:ban-count`;
export const KEY_BURST = `${KEY_PREFIX}:burst`;
export const KEY_SLOW_DOWN = `${KEY_PREFIX}:sd`;

export const DEFAULT_MEMORY_MAX_KEYS = 100_000;
export const DEFAULT_HEADERS_STANDARD = 'draft-7' as const;

export type ShieldLayer =
  | 'whitelist'
  | 'blacklist'
  | 'auto-ban'
  | 'user-agent'
  | 'payload'
  | 'burst'
  | 'rate-limit'
  | 'slow-down';

export const ALL_LAYERS: ShieldLayer[] = [
  'whitelist',
  'blacklist',
  'auto-ban',
  'user-agent',
  'payload',
  'burst',
  'rate-limit',
  'slow-down',
];
