import { IpUtil } from '../utils/ip.util';
import type { IpListConfig, CheckOutcome } from '../shield.types';

export class WhitelistCheck {
  static run(ip: string, config?: IpListConfig): CheckOutcome {
    if (!config) return { allowed: false };
    const hit = IpUtil.matches(ip, config.ips, config.cidrs);
    if (hit) return { allowed: true, layer: 'whitelist' };
    return { allowed: false };
  }
}
