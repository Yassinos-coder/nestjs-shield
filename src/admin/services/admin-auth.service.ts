import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { SHIELD_ENGINE } from '../../shield.constants';
import type { ShieldEngine } from '../../shield.engine';
import type { AnyRequest, AnyResponse } from '../../shield.types';
import { AdminRequestValidator } from '../validators/admin-request.validator';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_CSRF_HEADER,
  ENV_SECRET,
  LOGIN_LOCK_MS,
  LOGIN_MAX_FAILURES,
  LOGIN_MAX_TRACKED,
  SESSION_TTL_MS,
} from '../constants/admin.constants';
import type { AdminCredentials, AdminPageState, LoginAttempt } from '../interfaces';
import { AdminHttpUtil } from '../utils/admin-http.util';
import { AdminEnvValidator } from '../validators/admin-env.validator';

@Injectable()
export class AdminAuthService {
  private readonly attempts = new Map<string, LoginAttempt>();

  constructor(@Inject(SHIELD_ENGINE) private readonly engine: ShieldEngine) {}

  pageState(req: AnyRequest): AdminPageState {
    if (!AdminEnvValidator.isEnabled()) return 'disabled';
    if (!AdminEnvValidator.credentials()) return 'misconfigured';
    return this.hasValidSession(req) ? 'dashboard' : 'login';
  }

  assertApiAccess(req: AnyRequest): void {
    const state = this.pageState(req);
    if (state === 'disabled') throw new NotFoundException();
    if (state === 'misconfigured') {
      throw new ServiceUnavailableException(
        `Admin credentials are not configured: set ${AdminEnvValidator.missing().join(' and ')}`,
      );
    }
    if (state === 'login') throw new UnauthorizedException('Login required');
    if (this.isMutation(req) && AdminHttpUtil.header(req, ADMIN_CSRF_HEADER) !== '1') {
      throw new ForbiddenException('Missing CSRF header');
    }
  }

  login(req: AnyRequest, res: AnyResponse, body: unknown): void {
    if (!AdminEnvValidator.isEnabled()) throw new NotFoundException();
    const credentials = AdminEnvValidator.credentials();
    if (!credentials) {
      throw new ServiceUnavailableException(
        `Admin credentials are not configured: set ${AdminEnvValidator.missing().join(' and ')}`,
      );
    }

    const ip = this.engine.resolveIp(req);
    this.assertNotLocked(ip);

    const { username, password } = this.parseLogin(body);
    if (!this.matches(credentials, username, password)) {
      this.recordFailure(ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.attempts.delete(ip);
    this.issueSession(req, res, credentials);
  }

  logout(req: AnyRequest, res: AnyResponse): void {
    AdminHttpUtil.setHeader(res, 'Set-Cookie', this.cookie(req, '', 0));
  }

  private hasValidSession(req: AnyRequest): boolean {
    const credentials = AdminEnvValidator.credentials();
    if (!credentials) return false;
    const value = AdminHttpUtil.readCookie(req, ADMIN_COOKIE_NAME);
    if (!value) return false;

    const [expiresAt, signature] = value.split('.');
    if (!expiresAt || !signature) return false;
    if (!(Number(expiresAt) > Date.now())) return false;
    return this.safeEqual(signature, this.sign(expiresAt, credentials));
  }

  private issueSession(req: AnyRequest, res: AnyResponse, credentials: AdminCredentials): void {
    const expiresAt = String(Date.now() + SESSION_TTL_MS);
    const value = `${expiresAt}.${this.sign(expiresAt, credentials)}`;
    AdminHttpUtil.setHeader(res, 'Set-Cookie', this.cookie(req, value, SESSION_TTL_MS / 1000));
  }

  private cookie(req: AnyRequest, value: string, maxAgeSec: number): string {
    const parts = [
      `${ADMIN_COOKIE_NAME}=${value}`,
      `Path=${AdminRequestValidator.mountPath(req)}`,
      `Max-Age=${maxAgeSec}`,
      'HttpOnly',
      'SameSite=Strict',
    ];
    if (AdminHttpUtil.isSecure(req)) parts.push('Secure');
    return parts.join('; ');
  }

  private sign(payload: string, credentials: AdminCredentials): string {
    const secret = process.env[ENV_SECRET] || `${credentials.user}:${credentials.password}`;
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  private matches(credentials: AdminCredentials, username: string, password: string): boolean {
    const userOk = this.safeEqual(username, credentials.user);
    const passwordOk = this.safeEqual(password, credentials.password);
    return userOk && passwordOk;
  }

  private safeEqual(a: string, b: string): boolean {
    const left = createHash('sha256').update(a).digest();
    const right = createHash('sha256').update(b).digest();
    return timingSafeEqual(left, right);
  }

  private parseLogin(body: unknown): { username: string; password: string } {
    const input = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
    if (typeof input.username !== 'string' || typeof input.password !== 'string') {
      throw new BadRequestException('username and password are required');
    }
    return { username: input.username, password: input.password };
  }

  private assertNotLocked(ip: string): void {
    const attempt = this.attempts.get(ip);
    if (!attempt) return;
    if (attempt.resetAt <= Date.now()) {
      this.attempts.delete(ip);
      return;
    }
    if (attempt.count < LOGIN_MAX_FAILURES) return;
    throw new HttpException('Too many login attempts, try again later', HttpStatus.TOO_MANY_REQUESTS);
  }

  private recordFailure(ip: string): void {
    if (this.attempts.size >= LOGIN_MAX_TRACKED) this.pruneAttempts();
    const attempt = this.attempts.get(ip);
    if (!attempt || attempt.resetAt <= Date.now()) {
      this.attempts.set(ip, { count: 1, resetAt: Date.now() + LOGIN_LOCK_MS });
      return;
    }
    attempt.count += 1;
  }

  private pruneAttempts(): void {
    const now = Date.now();
    for (const [ip, attempt] of this.attempts) {
      if (attempt.resetAt <= now) this.attempts.delete(ip);
    }
    if (this.attempts.size < LOGIN_MAX_TRACKED) return;
    this.attempts.clear();
  }

  private isMutation(req: AnyRequest): boolean {
    const method = (req.method ?? 'GET').toUpperCase();
    return method !== 'GET' && method !== 'HEAD';
  }
}
