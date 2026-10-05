import type { AnyRequest, AnyResponse } from '../../shield.types';

export class AdminHttpUtil {
  static setHeader(res: AnyResponse, name: string, value: string): void {
    if (typeof res.setHeader === 'function') {
      res.setHeader(name, value);
      return;
    }
    const reply = res as unknown as { header?: (n: string, v: string) => unknown };
    if (typeof reply.header === 'function') reply.header(name, value);
  }

  static setStatus(res: AnyResponse, status: number): void {
    if (typeof res.status === 'function') {
      res.status(status);
      return;
    }
    res.statusCode = status;
  }

  static readCookie(req: AnyRequest, name: string): string | null {
    const raw = req.headers.cookie;
    if (!raw) return null;
    const header = Array.isArray(raw) ? raw.join(';') : raw;
    for (const part of header.split(';')) {
      const index = part.indexOf('=');
      if (index === -1) continue;
      if (part.slice(0, index).trim() !== name) continue;
      return part.slice(index + 1).trim();
    }
    return null;
  }

  static isSecure(req: AnyRequest): boolean {
    if (req.secure === true) return true;
    const proto = req.headers['x-forwarded-proto'];
    return (Array.isArray(proto) ? proto[0] : proto) === 'https';
  }

  static header(req: AnyRequest, name: string): string {
    const value = req.headers[name];
    if (!value) return '';
    return Array.isArray(value) ? value[0] : value;
  }
}
