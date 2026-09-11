import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { DutyCheckerComponent } from './components/duty-checker/duty-checker.component';
import { DutyLoggerComponent } from './components/duty-logger/duty-logger.component';
import { MetricsSummaryComponent } from './components/metrics-summary/metrics-summary.component';
import { ConfigModalComponent } from './components/config-modal/config-modal.component';
import { ColleagueModalComponent } from './components/colleague-modal/colleague-modal.component';
import { TutorialModalComponent } from './components/tutorial-modal/tutorial-modal.component';
import { ShiftService } from './services/shift.service';
import { DutySessionStoreService } from './services/duty-session-store.service';
import { ToastNotificationService } from './services/toast-notification.service';
import { DutyRole } from './models/shift.model';
import { BeforeInstallPromptEvent } from './models/pwa.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    DutyCheckerComponent,
    DutyLoggerComponent,
    MetricsSummaryComponent,
    ConfigModalComponent,
    ColleagueModalComponent,
    TutorialModalComponent,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly shiftService = inject(ShiftService);
  private readonly sessionStore = inject(DutySessionStoreService);
  private readonly toastService = inject(ToastNotificationService);

  readonly isConfigOpen = signal<boolean>(false);
  readonly isColleagueModalOpen = signal<boolean>(false);
  readonly isTutorialOpen = signal<boolean>(false);
  readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);

  constructor() {
    // Capture beforeinstallprompt for mobile PWA installation UX
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        this.deferredPrompt.set(e as BeforeInstallPromptEvent);
      });
    }
  }

  onColleagueAddedOrSelected(name: string): void {
    this.sessionStore.setActiveColleague(name);
  }

  onRecommendationApplied(data: { colleague: string; role: DutyRole }): void {
    this.sessionStore.applyRecommendation(data.colleague, data.role);
    this.toastService.show(`Recomendación aplicada: ${data.role}`, 'success');
  }

  async installPwa(): Promise<void> {
    const promptEvent = this.deferredPrompt();
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      this.deferredPrompt.set(null);
    }
  }
}
