import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SkipShield } from '../../decorators/skip-shield.decorator';
import type { AnyRequest, AnyResponse } from '../../shield.types';
import { ADMIN_BASE_PATH } from '../constants/admin.constants';
import { AdminSessionGuard } from '../guards/admin-session.guard';
import type {
  AdminBanList,
  AdminEvent,
  AdminSnapshot,
} from '../interfaces';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminStateService } from '../services/admin-state.service';
import { RequestLogService } from '../services/request-log.service';
import { AdminHttpUtil } from '../utils/admin-http.util';
import { SettingsValidator } from '../validators/settings.validator';
import { renderDashboardPage } from '../views/dashboard.html';
import { renderErrorPage } from '../views/error.html';
import { renderLoginPage } from '../views/login.html';

@SkipShield()
@Controller(ADMIN_BASE_PATH)
export class ShieldAdminController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly state: AdminStateService,
    private readonly log: RequestLogService,
  ) {}

  @Get()
  page(@Req() req: AnyRequest, @Res({ passthrough: true }) res: AnyResponse): string {
    const nonce = randomBytes(16).toString('base64');
    this.setPageHeaders(res, nonce);

    const state = this.auth.pageState(req);
    if (state === 'disabled') {
      AdminHttpUtil.setStatus(res, 404);
      return renderErrorPage(nonce, 'Not found', ['Cannot GET /shield/admin']);
    }
    if (state === 'misconfigured') {
      AdminHttpUtil.setStatus(res, 503);
      return renderErrorPage(nonce, 'Dashboard is not configured', [
        'SHIELD_DASH is enabled, but the admin credentials are missing.',
        'Set SHIELD_ADMIN_USER and SHIELD_ADMIN_PASSWORD in your .env and restart the server.',
        'Login is disabled until both are set.',
      ]);
    }
    if (state === 'login') return renderLoginPage(nonce);
    return renderDashboardPage(nonce);
  }

  @Post('login')
  @HttpCode(200)
  login(
    @Req() req: AnyRequest,
    @Res({ passthrough: true }) res: AnyResponse,
    @Body() body: unknown,
  ): { ok: true } {
    this.auth.login(req, res, body);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AdminSessionGuard)
  logout(@Req() req: AnyRequest, @Res({ passthrough: true }) res: AnyResponse): { ok: true } {
    this.auth.logout(req, res);
    return { ok: true };
  }

  @Get('api/state')
  @UseGuards(AdminSessionGuard)
  getState(@Res({ passthrough: true }) res: AnyResponse): AdminSnapshot {
    AdminHttpUtil.setHeader(res, 'Cache-Control', 'no-store');
    return this.state.getSnapshot(this.log.getStats());
  }

  @Get('api/events')
  @UseGuards(AdminSessionGuard)
  getEvents(
    @Res({ passthrough: true }) res: AnyResponse,
    @Query('since') since?: string,
  ): { events: AdminEvent[] } {
    AdminHttpUtil.setHeader(res, 'Cache-Control', 'no-store');
    const cursor = Number(since);
    return { events: this.log.getEvents(Number.isFinite(cursor) ? cursor : 0) };
  }

  @Get('api/bans')
  @UseGuards(AdminSessionGuard)
  getBans(@Res({ passthrough: true }) res: AnyResponse): Promise<AdminBanList> {
    AdminHttpUtil.setHeader(res, 'Cache-Control', 'no-store');
    return this.state.listBans();
  }

  @Post('api/bans')
  @HttpCode(200)
  @UseGuards(AdminSessionGuard)
  async createBan(@Body() body: unknown): Promise<{ ok: true }> {
    const { ip, minutes } = SettingsValidator.parseBan(body);
    await this.state.ban(ip, minutes);
    return { ok: true };
  }

  @Patch('api/settings')
  @UseGuards(AdminSessionGuard)
  async updateSettings(@Body() body: unknown): Promise<{ ok: true }> {
    await this.state.update(SettingsValidator.parseSettings(body));
    return { ok: true };
  }

  @Delete('api/settings')
  @UseGuards(AdminSessionGuard)
  async resetSettings(): Promise<{ ok: true }> {
    await this.state.reset();
    return { ok: true };
  }

  @Delete('api/bans/:ip')
  @UseGuards(AdminSessionGuard)
  async removeBan(@Param('ip') ip: string): Promise<{ ok: true }> {
    await this.state.unban(SettingsValidator.parseIp(ip, 'ip'));
    return { ok: true };
  }

  private setPageHeaders(res: AnyResponse, nonce: string): void {
    AdminHttpUtil.setHeader(res, 'Content-Type', 'text/html; charset=utf-8');
    AdminHttpUtil.setHeader(res, 'Cache-Control', 'no-store');
    AdminHttpUtil.setHeader(res, 'X-Frame-Options', 'DENY');
    AdminHttpUtil.setHeader(res, 'X-Content-Type-Options', 'nosniff');
    AdminHttpUtil.setHeader(res, 'Referrer-Policy', 'no-referrer');
    AdminHttpUtil.setHeader(
      res,
      'Content-Security-Policy',
      `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
    );
  }
}
