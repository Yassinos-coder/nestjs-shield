import type { ShieldService } from '../shield.service';
import type { AnyRequest, ProbeConfig } from '../shield.types';
import { PathUtil } from '../utils/path.util';
import { DEFAULT_PROBE_PATHS } from './probe.constants';

type NextFn = () => void;

export function createProbeMiddleware(service: ShieldService, probes: true | ProbeConfig) {
  const patterns = (probes === true ? undefined : probes.paths) ?? DEFAULT_PROBE_PATHS;

  return function probeMiddleware(req: AnyRequest, _res: unknown, next: NextFn): void {
    if (!PathUtil.matches(PathUtil.of(req.url), patterns)) return next();
    void service.recordViolation(service.resolveIp(req), 'probe').catch(() => undefined);
    next();
  };
}
