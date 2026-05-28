import { KEY_BAN, KEY_BAN_COUNT, KEY_VIOLATIONS } from '../shield.constants';
import type { ShieldStorage } from '../storage/shield-storage.interface';
import type { AutoBanConfig, CheckOutcome } from '../shield.types';

export class AutoBanCheck {
  static async check(
    storage: ShieldStorage,
    ip: string,
    config?: AutoBanConfig,
  ): Promise<CheckOutcome> {
    if (!config) return { allowed: true };
    const banKey = `${KEY_BAN}:${ip}`;
    const raw = await storage.get(banKey);
    if (!raw) return { allowed: true };

    const expiresAt = Number(raw);
    const remaining = Math.max(0, expiresAt - Date.now());
    if (remaining <= 0) {
      await storage.delete(banKey);
      return { allowed: true };
    }
    return {
      allowed: false,
      layer: 'auto-ban',
      status: 403,
      reason: 'IP temporarily banned for repeated violations',
      retryAfterMs: remaining,
    };
  }

  static async recordViolation(
    storage: ShieldStorage,
    ip: string,
    config?: AutoBanConfig,
  ): Promise<void> {
    if (!config) return;
    const violationsKey = `${KEY_VIOLATIONS}:${ip}`;
    const { count } = await storage.increment(violationsKey, config.window);
    if (count < config.threshold) return;

    const banCountKey = `${KEY_BAN_COUNT}:${ip}`;
    const banCountResult = await storage.increment(banCountKey, config.banDuration * 16);
    const escalation = config.escalate === false ? 1 : Math.pow(2, banCountResult.count - 1);
    const duration = config.banDuration * escalation;
    const expiresAt = Date.now() + duration;
    await storage.set(`${KEY_BAN}:${ip}`, String(expiresAt), duration);
    await storage.delete(violationsKey);
  }
}
