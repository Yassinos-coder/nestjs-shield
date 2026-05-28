import { HttpException, HttpStatus } from '@nestjs/common';

export interface ShieldExceptionPayload {
  message: string;
  code: string;
  layer: string;
  retryAfter?: number;
}

export class ShieldRateLimitException extends HttpException {
  constructor(payload: Omit<ShieldExceptionPayload, 'code'> & { code?: string }) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: payload.code ?? 'SHIELD_RATE_LIMITED',
        message: payload.message,
        layer: payload.layer,
        retryAfter: payload.retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class ShieldBlockedException extends HttpException {
  constructor(payload: Omit<ShieldExceptionPayload, 'code'> & { code?: string; status?: number }) {
    const status = payload.status ?? HttpStatus.FORBIDDEN;
    super(
      {
        statusCode: status,
        code: payload.code ?? 'SHIELD_BLOCKED',
        message: payload.message,
        layer: payload.layer,
        retryAfter: payload.retryAfter,
      },
      status,
    );
  }
}

export class ShieldPayloadException extends HttpException {
  constructor(payload: Omit<ShieldExceptionPayload, 'code'> & { code?: string }) {
    super(
      {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        code: payload.code ?? 'SHIELD_PAYLOAD_TOO_LARGE',
        message: payload.message,
        layer: payload.layer,
      },
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}
