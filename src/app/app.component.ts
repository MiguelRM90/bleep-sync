import { Component, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { DutyCheckerComponent } from './components/duty-checker/duty-checker.component';
import { DutyLoggerComponent } from './components/duty-logger/duty-logger.component';
import { MetricsSummaryComponent } from './components/metrics-summary/metrics-summary.component';
import { ConfigModalComponent } from './components/config-modal/config-modal.component';
import { ColleagueModalComponent } from './components/colleague-modal/colleague-modal.component';
import { ShiftService } from './services/shift.service';
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
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly shiftService = inject(ShiftService);
  readonly isConfigOpen = signal<boolean>(false);
  readonly isColleagueModalOpen = signal<boolean>(false);
  readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);

  // ViewChild references
  private readonly dutyChecker = viewChild(DutyCheckerComponent);
  private readonly dutyLogger = viewChild(DutyLoggerComponent);

  constructor() {
    // Capture beforeinstallprompt for mobile PWA installation UX
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        this.deferredPrompt.set(e as BeforeInstallPromptEvent);
      });
    }
  }

  onColleagueChanged(name: string): void {
    this.dutyLogger()?.setColleagueFromChecker(name);
  }

  onColleagueAddedOrSelected(name: string): void {
    this.dutyChecker()?.selectColleagueDirectly(name);
    this.dutyLogger()?.setColleagueFromChecker(name);
  }

  onRecommendationApplied(data: { colleague: string; role: DutyRole }): void {
    this.dutyLogger()?.setPreselection(data.colleague, data.role);
    this.shiftService.showToast(`Recomendación aplicada: ${data.role}`, 'success');
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
