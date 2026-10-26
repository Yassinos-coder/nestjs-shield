import type { ShieldEvent } from '../shield.types';

export class EventUtil {
  static emit(hook: ((event: ShieldEvent) => void) | undefined, event: ShieldEvent): void {
    if (!hook) return;
    try {
      hook(event);
    } catch {
      // the event hook must never break the pipeline
    }
  }
}
