import type { Provider } from '@nestjs/common';
import { SHIELD_RUNTIME } from './constants/admin.constants';
import { AdminSessionGuard } from './guards/admin-session.guard';
import type { ShieldRuntime } from './interfaces';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminStateService } from './services/admin-state.service';
import { RequestLogService } from './services/request-log.service';

export const ADMIN_PROVIDERS: Provider[] = [
  AdminStateService,
  RequestLogService,
  AdminAuthService,
  AdminSessionGuard,
  {
    provide: SHIELD_RUNTIME,
    useFactory: (state: AdminStateService, log: RequestLogService): ShieldRuntime => ({
      isActive: () => state.isActive(),
      effectiveConfig: (base) => state.effectiveConfig(base),
      record: (req, res, decision) => log.record(req, res, decision),
    }),
    inject: [AdminStateService, RequestLogService],
  },
];
