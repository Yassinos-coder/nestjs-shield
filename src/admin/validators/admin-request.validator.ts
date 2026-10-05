import { ADMIN_URL_PREFIX } from '../constants/admin.constants';

export class AdminRequestValidator {
  static isAdminPath(url: string | undefined): boolean {
    if (!url) return false;
    const path = url.split('?')[0];
    return path === ADMIN_URL_PREFIX || path.startsWith(`${ADMIN_URL_PREFIX}/`);
  }
}
