import type { ShieldEngine } from './shield.engine';
import type { AnyRequest, AnyResponse } from './shield.types';

type NextFn = (err?: unknown) => void;

export function createShieldMiddleware(engine: ShieldEngine) {
  return async function shieldMiddleware(req: AnyRequest, res: AnyResponse, next: NextFn) {
    try {
      const decision = await engine.run(req, res);
      if (!decision.allowed && decision.exception) {
        const exc = decision.exception;
        const response = exc.getResponse() as Record<string, unknown>;
        const status = exc.getStatus();
        if (typeof res.status === 'function') {
          const r = res.status(status);
          if (typeof r.json === 'function') {
            r.json(response);
            return;
          }
        }
        if (typeof res.setHeader === 'function') {
          res.setHeader('Content-Type', 'application/json');
        }
        (res as unknown as { statusCode: number }).statusCode = status;
        if (typeof res.end === 'function') res.end(JSON.stringify(response));
        return;
      }

      if (decision.release && typeof res.on === 'function') {
        const fired = { done: false };
        const fire = () => {
          if (fired.done) return;
          fired.done = true;
          Promise.resolve(decision.release?.()).catch(() => undefined);
        };
        res.on('finish', fire);
        res.on('close', fire);
      }

      if (decision.delayMs && decision.delayMs > 0) {
        await new Promise((r) => setTimeout(r, decision.delayMs));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
