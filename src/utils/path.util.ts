export class PathUtil {
  static of(url: string | undefined): string {
    return String(url ?? '/').split('?')[0];
  }

  static matches(path: string, patterns: (string | RegExp)[]): boolean {
    for (const pattern of patterns) {
      if (pattern instanceof RegExp) {
        if (pattern.test(path)) return true;
        continue;
      }
      if (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern) return true;
    }
    return false;
  }
}
