import type { EngineDecision } from '../../shield.engine';
import type { AdminDecision } from '../interfaces';

export class AdminDecisionMapper {
  static fromEngine(decision: EngineDecision): AdminDecision {
    if (decision.allowed || !decision.exception) {
      return { allowed: decision.allowed, ip: decision.ip };
    }
    const body = decision.exception.getResponse() as { layer?: string; message?: string };
    return {
      allowed: false,
      ip: decision.ip,
      layer: body.layer,
      reason: body.message,
      status: decision.exception.getStatus(),
    };
  }
}
