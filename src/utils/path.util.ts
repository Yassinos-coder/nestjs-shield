export class PathUtil {
  static of(url: string | undefined): string {
    return String(url ?? '/').split('?')[0];
  }

  static matches(path: string, patterns: (string | RegExp)[]): boolean {
    for (const pattern of patterns) {
      if (pattern instanceof RegExp) {
        pattern.lastIndex = 0;
        const matched = pattern.test(path);
        pattern.lastIndex = 0;
        if (matched) return true;
        continue;
      }
      if (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern) return true;
    }
    return false;
  }
}
