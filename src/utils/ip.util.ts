import * as ipaddr from 'ipaddr.js';
import type { AnyRequest } from '../shield.types';

export class IpUtil {
  static resolve(req: AnyRequest, trustProxy: boolean | number = false): string {
    const xff = req.headers['x-forwarded-for'];
    if (trustProxy && xff) {
      const list = Array.isArray(xff) ? xff.join(',') : String(xff);
      const parts = list.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length) {
        if (typeof trustProxy === 'number') {
          const idx = Math.max(0, parts.length - trustProxy - 1);
          if (parts[idx]) return IpUtil.normalize(parts[idx]);
        }
        return IpUtil.normalize(parts[0]);
      }
    }

    if (trustProxy && Array.isArray(req.ips) && req.ips.length > 0) {
      return IpUtil.normalize(req.ips[0]);
    }

    const direct =
      req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '0.0.0.0';
    return IpUtil.normalize(direct);
  }

  static normalize(addr: string): string {
    const trimmed = addr.trim();
    if (trimmed.startsWith('::ffff:')) return trimmed.slice(7);
    return trimmed;
  }

  static matches(ip: string, ips: string[] = [], cidrs: string[] = []): boolean {
    if (!ip) return false;
    if (ips.includes(ip)) return true;
    if (cidrs.length === 0) return false;

    let parsed: ipaddr.IPv4 | ipaddr.IPv6;
    try {
      parsed = ipaddr.parse(ip);
    } catch {
      return false;
    }

    for (const cidr of cidrs) {
      try {
        const [range, prefix] = ipaddr.parseCIDR(cidr);
        if (parsed.kind() !== range.kind()) continue;
        if (parsed.kind() === 'ipv4') {
          if ((parsed as ipaddr.IPv4).match([range as ipaddr.IPv4, prefix])) return true;
        } else {
          if ((parsed as ipaddr.IPv6).match([range as ipaddr.IPv6, prefix])) return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }
}
