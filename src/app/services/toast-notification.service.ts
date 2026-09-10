import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'info' | 'error';

export interface ToastMessage {
  text: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastNotificationService {
  readonly currentToast = signal<ToastMessage | null>(null);
  private timerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Display a temporary toast message
   */
  show(text: string, type: ToastType = 'info', durationMs = 3500): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.currentToast.set({ text, type });

    this.timerId = setTimeout(() => {
      if (this.currentToast()?.text === text) {
        this.currentToast.set(null);
      }
      this.timerId = null;
    }, durationMs);
  }

  /**
   * Clear any active toast
   */
  clear(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentToast.set(null);
  }
}

