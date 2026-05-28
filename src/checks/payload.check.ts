import type { AnyRequest, CheckOutcome, PayloadConfig } from '../shield.types';

export class PayloadCheck {
  static run(req: AnyRequest, config?: PayloadConfig): CheckOutcome {
    if (!config) return { allowed: true };

    if (config.maxHeaderBytes !== undefined) {
      const size = PayloadCheck.estimateHeaderBytes(req.headers);
      if (size > config.maxHeaderBytes) {
        return {
          allowed: false,
          layer: 'payload',
          status: 431,
          reason: `Header size ${size} exceeds limit ${config.maxHeaderBytes}`,
        };
      }
    }

    if (config.maxBodyBytes !== undefined) {
      const cl = req.headers['content-length'];
      if (cl !== undefined) {
        const declared = Number(Array.isArray(cl) ? cl[0] : cl);
        if (Number.isFinite(declared) && declared > config.maxBodyBytes) {
          return {
            allowed: false,
            layer: 'payload',
            status: 413,
            reason: `Payload size ${declared} exceeds limit ${config.maxBodyBytes}`,
          };
        }
      }
    }

    return { allowed: true };
  }

  private static estimateHeaderBytes(
    headers: Record<string, string | string[] | undefined>,
  ): number {
    let total = 0;
    for (const [k, v] of Object.entries(headers)) {
      if (v === undefined) continue;
      const value = Array.isArray(v) ? v.join(',') : String(v);
      total += k.length + value.length + 4;
    }
    return total;
  }
}
