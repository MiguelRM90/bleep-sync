import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HapticService {
  readonly isEnabled = signal<boolean>(true);

  setEnabled(enabled: boolean): void {
    this.isEnabled.set(enabled);
  }

  /**
   * Trigger haptic vibration on tactile devices if supported and enabled
   */
  trigger(pattern: number | number[] = 40): void {
    if (!this.isEnabled()) return;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently ignore if blocked by browser policy / user gesture requirement
      }
    }
  }
}

