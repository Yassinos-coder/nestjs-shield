export class UaUtil {
  static match(ua: string, patterns: (string | RegExp)[]): boolean {
    if (!ua) return false;
    for (const p of patterns) {
      if (p instanceof RegExp) {
        if (p.test(ua)) return true;
        continue;
      }
      if (ua.toLowerCase().includes(String(p).toLowerCase())) return true;
    }
    return false;
  }

  static extract(headers: Record<string, string | string[] | undefined>): string {
    const v = headers['user-agent'];
    if (!v) return '';
    return Array.isArray(v) ? v.join(' ') : v;
  }
}
