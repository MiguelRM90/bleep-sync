import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NetworkStatusService implements OnDestroy {
  readonly isOnline = signal<boolean>(
    typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true
  );

  private readonly onlineHandler: () => void;
  private readonly offlineHandler: () => void;

  constructor() {
    this.onlineHandler = () => this.isOnline.set(true);
    this.offlineHandler = () => this.isOnline.set(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
  }
}

