import type { ShieldConfig } from '../shield.types';

export class BannerUtil {
  static build(config: ShieldConfig): { banner: string; summary: string } {
    const version = BannerUtil.version();
    const title = `nestjs-shield v${version}  --  up and running`;
    const inner = ` ${title} `;
    const width = Math.max(inner.length, 50);
    const padded = BannerUtil.centerPad(inner, width);
    const top = '   +' + '-'.repeat(width) + '+';
    const mid = '   |' + ' '.repeat(width) + '|';
    const banner = [
      '',
      top,
      mid,
      '   |' + padded + '|',
      mid,
      '   +' + '-'.repeat(width) + '+',
      '',
    ].join('\n');

    const layers: string[] = [];
    if (config.whitelist) layers.push('whitelist');
    if (config.blacklist) layers.push('blacklist');
    if (config.autoBan) layers.push('auto-ban');
    if (config.userAgent) layers.push('user-agent');
    if (config.payload) layers.push('payload');
    if (config.burst) layers.push('burst');
    if (config.rateLimit) layers.push('rate-limit');
    if (config.slowDown) layers.push('slow-down');

    const parts: string[] = [`storage=${BannerUtil.storageLabel(config)}`];
    if (config.rateLimit) {
      const rl = config.rateLimit;
      const seconds = Math.max(1, Math.round(rl.ttl / 1000));
      parts.push(`rate=${rl.limit}/${seconds}s (${rl.algorithm ?? 'token-bucket'})`);
    }
    if (layers.length) parts.push(`layers=[${layers.join(', ')}]`);

    return { banner, summary: parts.join(' | ') };
  }

  private static centerPad(text: string, width: number): string {
    if (text.length >= width) return text.slice(0, width);
    const total = width - text.length;
    const left = Math.floor(total / 2);
    const right = total - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  }

  private static storageLabel(config: ShieldConfig): string {
    const s = config.storage;
    if (!s || s === 'memory') return 'memory';
    if (typeof s === 'object' && 'type' in s) return s.type;
    return 'custom';
  }

  private static version(): string {
    try {
      const pkg = require('../../package.json') as { version?: string };
      return pkg.version ?? '?';
    } catch {
      return '?';
    }
  }
}
