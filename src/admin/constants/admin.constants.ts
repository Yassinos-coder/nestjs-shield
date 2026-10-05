export const SHIELD_RUNTIME = 'SHIELD_RUNTIME';

export const ADMIN_BASE_PATH = 'shield/admin';
export const ADMIN_URL_PREFIX = '/shield/admin';
export const ADMIN_COOKIE_NAME = 'shield_admin';
export const ADMIN_CSRF_HEADER = 'x-shield-admin';

export const ENV_DASH = 'SHIELD_DASH';
export const ENV_USER = 'SHIELD_ADMIN_USER';
export const ENV_PASSWORD = 'SHIELD_ADMIN_PASSWORD';
export const ENV_SECRET = 'SHIELD_ADMIN_SECRET';

export const KEY_ADMIN_OVERRIDES = 'shield:admin:overrides';
export const OVERRIDES_TTL_MS = 10 * 365 * 24 * 60 * 60 * 1000;
export const OVERRIDES_REFRESH_MS = 2_000;

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
export const LOGIN_MAX_TRACKED = 1_000;

export const DEFAULT_MAX_EVENTS = 500;
export const MAX_EVENTS_PER_POLL = 200;
export const STATS_MINUTES = 30;
export const MAX_PATH_LENGTH = 300;
export const MAX_UA_LENGTH = 200;

export const DEFAULT_ATTACK_FACTOR = 5;
export const ATTACK_FALLBACK_RATE_LIMIT = { limit: 60, ttl: 60_000 };
export const ATTACK_FALLBACK_AUTO_BAN = {
  threshold: 10,
  window: 60_000,
  banDuration: 5 * 60_000,
};
export const ATTACK_BOT_PATTERN =
  /curl|wget|python|scrapy|httpclient|go-http-client|java\/|libwww|bot|crawl|spider|headless/i;

export const MAX_LIST_ENTRIES = 1_000;
export const MAX_BAN_MINUTES = 60 * 24 * 365;
export const DEFAULT_BAN_MINUTES = 60;
export const MAX_BAN_SCAN = 1_000;

export const RATE_LIMIT_ALGORITHMS = [
  'token-bucket',
  'sliding-window',
  'sliding-window-log',
  'fixed-window',
  'leaky-bucket',
] as const;
