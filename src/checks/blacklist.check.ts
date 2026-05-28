import { IpUtil } from '../utils/ip.util';
import type { BlacklistConfig, CheckOutcome } from '../shield.types';

export class BlacklistCheck {
  static run(ip: string, config?: BlacklistConfig): CheckOutcome {
    if (!config) return { allowed: true };
    const hit = IpUtil.matches(ip, config.ips, config.cidrs);
    if (!hit) return { allowed: true };
    return {
      allowed: false,
      layer: 'blacklist',
      status: config.statusCode ?? 403,
      reason: 'IP is blacklisted',
    };
  }
}
