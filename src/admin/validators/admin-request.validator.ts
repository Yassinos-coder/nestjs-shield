import type { AnyRequest } from '../../shield.types';
import { ADMIN_URL_PREFIX } from '../constants/admin.constants';

const SAFE_MOUNT = /^(?:\/[A-Za-z0-9_.~%-]+)*$/;

export class AdminRequestValidator {
  static isAdminPath(url: string | undefined): boolean {
    if (!url) return false;
    return AdminRequestValidator.mountIndex(url.split('?')[0]) !== -1;
  }

  static mountPath(req: AnyRequest): string {
    const raw = typeof req.originalUrl === 'string' ? req.originalUrl : req.url;
    if (!raw) return ADMIN_URL_PREFIX;
    const path = raw.split('?')[0];
    const index = AdminRequestValidator.mountIndex(path);
    if (index === -1) return ADMIN_URL_PREFIX;
    const outer = path.slice(0, index);
    return SAFE_MOUNT.test(outer) ? `${outer}${ADMIN_URL_PREFIX}` : ADMIN_URL_PREFIX;
  }

  private static mountIndex(path: string): number {
    if (path === ADMIN_URL_PREFIX || path.startsWith(`${ADMIN_URL_PREFIX}/`)) return 0;
    const inner = path.indexOf(`${ADMIN_URL_PREFIX}/`);
    if (inner !== -1) return inner;
    return path.endsWith(ADMIN_URL_PREFIX) ? path.length - ADMIN_URL_PREFIX.length : -1;
  }
}
