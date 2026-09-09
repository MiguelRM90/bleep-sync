import { Component, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { DutyCheckerComponent } from './components/duty-checker/duty-checker.component';
import { DutyLoggerComponent } from './components/duty-logger/duty-logger.component';
import { MetricsSummaryComponent } from './components/metrics-summary/metrics-summary.component';
import { ConfigModalComponent } from './components/config-modal/config-modal.component';
import { ShiftService } from './services/shift.service';
import { DutyRole } from './models/shift.model';

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
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly shiftService = inject(ShiftService);
  readonly isConfigOpen = signal<boolean>(false);
  readonly deferredPrompt = signal<any>(null);

  // ViewChild reference to DutyLoggerComponent
  private readonly dutyLogger = viewChild(DutyLoggerComponent);

  constructor() {
    // Capture beforeinstallprompt for mobile PWA installation UX
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt.set(e);
      });
    }
  }

  onColleagueChanged(name: string): void {
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
