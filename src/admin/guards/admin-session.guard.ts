import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AnyRequest } from '../../shield.types';
import { AdminAuthService } from '../services/admin-auth.service';

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AnyRequest>();
    this.auth.assertApiAccess(req);
    return true;
  }
}
