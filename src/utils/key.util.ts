import type { AnyRequest, KeyByOption } from '../shield.types';

export class KeyUtil {
  static fromRequest(req: AnyRequest, ip: string, keyBy?: KeyByOption): string {
    if (!keyBy || keyBy === 'ip') return ip;
    if (typeof keyBy === 'function') return keyBy(req);
    if (typeof keyBy === 'object' && 'header' in keyBy) {
      const v = req.headers[keyBy.header.toLowerCase()];
      if (!v) return ip;
      return Array.isArray(v) ? v.join(',') : String(v);
    }
    return ip;
  }

  static route(req: AnyRequest): string {
    const method = (req.method ?? 'GET').toUpperCase();
    const url = String(req.url ?? '/').split('?')[0];
    return `${method} ${url}`;
  }
}
