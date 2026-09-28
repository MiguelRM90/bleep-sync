import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PwaToastContainerComponent } from 'pwa-ui-core/components';
import { PwaService, PwaToastService } from 'pwa-ui-core/services';
import { ColleagueModalComponent } from './components/colleague-modal/colleague-modal.component';
import { ConfigModalComponent } from './components/config-modal/config-modal.component';
import { DutyCheckerComponent } from './components/duty-checker/duty-checker.component';
import { DutyLoggerComponent } from './components/duty-logger/duty-logger.component';
import { HeaderComponent } from './components/header/header.component';
import { MetricsSummaryComponent } from './components/metrics-summary/metrics-summary.component';
import { TutorialModalComponent } from './components/tutorial-modal/tutorial-modal.component';
import { BeforeInstallPromptEvent } from './models/pwa.model';
import { DutyRole } from './models/shift.model';
import { DutySessionStoreService } from './services/duty-session-store.service';
import { ShiftService } from './services/shift.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    DutyCheckerComponent,
    DutyLoggerComponent,
    MetricsSummaryComponent,
    ConfigModalComponent,
    ColleagueModalComponent,
    TutorialModalComponent,
    PwaToastContainerComponent,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly shiftService = inject(ShiftService);
  readonly pwaService = inject(PwaService);
  private readonly sessionStore = inject(DutySessionStoreService);
  private readonly toastService = inject(PwaToastService);

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
    this.toastService.success(`Recomendación aplicada: ${data.role}`);
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
