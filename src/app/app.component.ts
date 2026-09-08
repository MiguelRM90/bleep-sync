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
  template: `
    <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans pb-10">
      <!-- Header with Clinical Status and Settings -->
      <app-header (openConfig)="isConfigOpen.set(true)"></app-header>

      <!-- PWA Install Prompt Banner (if deferred prompt is caught) -->
      @if (deferredPrompt() !== null) {
        <aside class="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2.5">
          <div class="max-w-xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span class="text-emerald-200 font-medium">Instala BleepSync en tu móvil para uso offline en quirófano</span>
            </div>
            <button
              (click)="installPwa()"
              class="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition tactile-btn shrink-0"
            >
              Instalar App
            </button>
          </div>
        </aside>
      }

      <!-- Main Content Container -->
      <main class="max-w-xl w-full mx-auto px-4 py-5 space-y-5 flex-1">
        <!-- Duty Checker: Colleague Selector & Dynamic Recommendation -->
        <app-duty-checker
          (colleagueChange)="onColleagueChanged($event)"
          (recommendationApplied)="onRecommendationApplied($event)"
        ></app-duty-checker>

        <!-- Duty Logger: Large Touch Targets & Tactile Submission -->
        <app-duty-logger></app-duty-logger>

        <!-- Metrics & Shift History Timeline -->
        <app-metrics-summary></app-metrics-summary>
      </main>

      <!-- Footer Info -->
      <footer class="max-w-xl mx-auto px-4 pt-4 text-center text-xs text-slate-500">
        <p class="flex items-center justify-center gap-1.5 font-medium">
          <span>BleepSync PWA</span>
          <span>•</span>
          <span>Respaldo con Google Sheets</span>
          <span>•</span>
          <span>Offline-Ready</span>
        </p>
      </footer>

      <!-- Configuration Modal -->
      @if (isConfigOpen()) {
        <app-config-modal (close)="isConfigOpen.set(false)"></app-config-modal>
      }

      <!-- Toast Feedback Floating Notification -->
      @if (shiftService.toastMessage(); as toast) {
        <div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-fade-in pointer-events-none px-4 max-w-md w-full">
          <div
            class="px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 border backdrop-blur-md"
            [ngClass]="{
              'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/80': toast.type === 'success',
              'bg-slate-900/90 text-slate-200 border-slate-700 shadow-slate-950/80': toast.type === 'info',
              'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-950/80': toast.type === 'error'
            }"
          >
            @if (toast.type === 'success') {
              <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
            } @else if (toast.type === 'error') {
              <svg class="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            } @else {
              <svg class="w-4 h-4 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            }
            <span class="flex-1">{{ toast.text }}</span>
          </div>
        </div>
      }
    </div>
  `,
})
export class AppComponent {
  readonly shiftService = inject(ShiftService);
  readonly isConfigOpen = signal<boolean>(false);
  readonly deferredPrompt = signal<any>(null);

  // ViewChild reference to DutyLoggerComponent
  private readonly dutyLogger = viewChild(DutyLoggerComponent);

  constructor() {
    // Capture beforeinstallprompt for PWA installation UX
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

