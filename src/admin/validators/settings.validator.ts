import { BadRequestException } from '@nestjs/common';
import * as ipaddr from 'ipaddr.js';
import type { AutoBanConfig, IpListConfig, RateLimitAlgorithm } from '../../shield.types';
import { IpUtil } from '../../utils/ip.util';
import {
  DEFAULT_BAN_MINUTES,
  MAX_BAN_MINUTES,
  MAX_LIST_ENTRIES,
  RATE_LIMIT_ALGORITHMS,
} from '../constants/admin.constants';
import type { AdminOverrides, AdminRateLimitOverride, BanInput } from '../interfaces';

export class SettingsValidator {
  static parseSettings(body: unknown): AdminOverrides {
    const input = SettingsValidator.asObject(body, 'body');
    const out: AdminOverrides = {};

    if ('enabled' in input) out.enabled = SettingsValidator.asBoolean(input.enabled, 'enabled');
    if ('attackMode' in input) {
      out.attackMode = SettingsValidator.asBoolean(input.attackMode, 'attackMode');
    }
    if ('rateLimit' in input) out.rateLimit = SettingsValidator.parseRateLimit(input.rateLimit);
    if ('whitelist' in input) out.whitelist = SettingsValidator.parseIpList(input.whitelist, 'whitelist');
    if ('blacklist' in input) out.blacklist = SettingsValidator.parseIpList(input.blacklist, 'blacklist');
    if ('autoBan' in input) out.autoBan = SettingsValidator.parseAutoBan(input.autoBan);

    if (Object.keys(out).length === 0) throw new BadRequestException('No settings provided');
    return out;
  }

  static parseBan(body: unknown): BanInput {
    const input = SettingsValidator.asObject(body, 'body');
    const ip = SettingsValidator.parseIp(input.ip, 'ip');
    const minutes =
      input.minutes === undefined
        ? DEFAULT_BAN_MINUTES
        : SettingsValidator.asInt(input.minutes, 'minutes', 1, MAX_BAN_MINUTES);
    return { ip, minutes };
  }

  static parseIp(value: unknown, field: string): string {
    if (typeof value !== 'string') throw new BadRequestException(`${field} must be a string`);
    const ip = IpUtil.normalize(value);
    if (!ipaddr.isValid(ip) || ip.includes('/')) {
      throw new BadRequestException(`${field} is not a valid IP address`);
    }
    return ip;
  }

  private static parseRateLimit(value: unknown): AdminRateLimitOverride | null {
    if (value === null) return null;
    const input = SettingsValidator.asObject(value, 'rateLimit');
    const limit = SettingsValidator.asInt(input.limit, 'rateLimit.limit', 1, 10_000_000);
    const ttl = SettingsValidator.asInt(input.ttl, 'rateLimit.ttl', 1_000, 86_400_000);
    if (input.algorithm === undefined) return { limit, ttl };
    if (!(RATE_LIMIT_ALGORITHMS as readonly unknown[]).includes(input.algorithm)) {
      throw new BadRequestException('rateLimit.algorithm is not supported');
    }
    return { limit, ttl, algorithm: input.algorithm as RateLimitAlgorithm };
  }

  private static parseIpList(value: unknown, field: string): IpListConfig {
    const input = SettingsValidator.asObject(value, field);
    return {
      ips: SettingsValidator.asEntries(input.ips, `${field}.ips`).map((entry) =>
        SettingsValidator.parseIp(entry, `${field}.ips`),
      ),
      cidrs: SettingsValidator.asEntries(input.cidrs, `${field}.cidrs`).map((entry) =>
        SettingsValidator.parseCidr(entry, `${field}.cidrs`),
      ),
    };
  }

  private static parseAutoBan(value: unknown): AutoBanConfig | null {
    if (value === null) return null;
    const input = SettingsValidator.asObject(value, 'autoBan');
    const out: AutoBanConfig = {
      threshold: SettingsValidator.asInt(input.threshold, 'autoBan.threshold', 1, 1_000_000),
      window: SettingsValidator.asInt(input.window, 'autoBan.window', 1_000, 86_400_000),
      banDuration: SettingsValidator.asInt(input.banDuration, 'autoBan.banDuration', 1_000, 31_536_000_000),
    };
    if (input.escalate !== undefined) {
      out.escalate = SettingsValidator.asBoolean(input.escalate, 'autoBan.escalate');
    }
    if (input.maxBanDuration !== undefined) {
      out.maxBanDuration = SettingsValidator.asInt(
        input.maxBanDuration,
        'autoBan.maxBanDuration',
        1_000,
        31_536_000_000,
      );
    }
    return out;
  }

  private static parseCidr(value: unknown, field: string): string {
    if (typeof value !== 'string') throw new BadRequestException(`${field} entries must be strings`);
    const cidr = value.trim();
    try {
      ipaddr.parseCIDR(cidr);
    } catch {
      throw new BadRequestException(`${field} contains an invalid CIDR: ${cidr.slice(0, 60)}`);
    }
    return cidr;
  }

  private static asEntries(value: unknown, field: string): unknown[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new BadRequestException(`${field} must be an array`);
    if (value.length > MAX_LIST_ENTRIES) {
      throw new BadRequestException(`${field} allows at most ${MAX_LIST_ENTRIES} entries`);
    }
    return value;
  }

  private static asObject(value: unknown, field: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new BadRequestException(`${field} must be an object`);
    }
    return value as Record<string, unknown>;
  }

  private static asBoolean(value: unknown, field: string): boolean {
    if (typeof value !== 'boolean') throw new BadRequestException(`${field} must be a boolean`);
    return value;
  }

  private static asInt(value: unknown, field: string, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
      throw new BadRequestException(`${field} must be an integer between ${min} and ${max}`);
    }
    return value;
  }
}
