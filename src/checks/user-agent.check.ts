import { UaUtil } from '../utils/ua.util';
import type { CheckOutcome, UserAgentConfig } from '../shield.types';

export class UserAgentCheck {
  static run(ua: string, config?: UserAgentConfig): CheckOutcome {
    if (!config) return { allowed: true };

    if (config.requirePresent && !ua) {
      return {
        allowed: false,
        layer: 'user-agent',
        status: 403,
        reason: 'User-Agent header required',
      };
    }

    if (config.allow && config.allow.length > 0 && UaUtil.match(ua, config.allow)) {
      return { allowed: true };
    }

    if (config.block && config.block.length > 0 && UaUtil.match(ua, config.block)) {
      return {
        allowed: false,
        layer: 'user-agent',
        status: 403,
        reason: 'User-Agent is blocked',
      };
    }

    return { allowed: true };
  }
}
