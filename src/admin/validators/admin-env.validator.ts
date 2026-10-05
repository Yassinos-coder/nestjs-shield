import type { AdminCredentials } from '../interfaces';
import { ENV_DASH, ENV_PASSWORD, ENV_USER } from '../constants/admin.constants';

export class AdminEnvValidator {
  static isEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return env[ENV_DASH]?.trim().toLowerCase() === 'true';
  }

  static credentials(env: NodeJS.ProcessEnv = process.env): AdminCredentials | null {
    const user = env[ENV_USER];
    const password = env[ENV_PASSWORD];
    if (!user || !password) return null;
    return { user, password };
  }

  static missing(env: NodeJS.ProcessEnv = process.env): string[] {
    const missing: string[] = [];
    if (!env[ENV_USER]) missing.push(ENV_USER);
    if (!env[ENV_PASSWORD]) missing.push(ENV_PASSWORD);
    return missing;
  }
}
