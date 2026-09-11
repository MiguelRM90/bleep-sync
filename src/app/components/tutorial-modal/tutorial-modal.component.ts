import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../ui/modal/modal.component';
import { ShiftService } from '../../services/shift.service';
import { BeforeInstallPromptEvent } from '../../models/pwa.model';

export interface TutorialStep {
  id: number;
  title: string;
  shortTitle: string;
  icon: string;
}

@Component({
  selector: 'app-tutorial-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './tutorial-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TutorialModalComponent {
  readonly shiftService = inject(ShiftService);

  readonly deferredPrompt = input<BeforeInstallPromptEvent | null>(null);

  readonly close = output<void>();
  readonly openColleagueManager = output<void>();
  readonly openConfig = output<void>();
  readonly installPwa = output<void>();

  readonly currentStep = signal<number>(1);
  readonly totalSteps = 5;

  readonly steps: TutorialStep[] = [
    { id: 1, title: 'Instalar como App Móvil', shortTitle: 'App Móvil', icon: '📱' },
    { id: 2, title: 'Sincronizar con Google Drive', shortTitle: 'Google Drive', icon: '☁️' },
    { id: 3, title: 'Añadir Equipo y Guardias', shortTitle: 'Guardias', icon: '👥' },
    { id: 4, title: 'Historial y Borrado', shortTitle: 'Borrado', icon: '🗑️' },
    { id: 5, title: 'Consejos Pro', shortTitle: 'Consejos', icon: '💡' },
  ];

  setStep(stepId: number): void {
    if (stepId >= 1 && stepId <= this.totalSteps) {
      this.currentStep.set(stepId);
    }
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
    } else {
      this.finishTutorial();
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  finishTutorial(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('bleepsync_tutorial_seen', 'true');
      } catch {
        // ignore localStorage failure
      }
    }
    this.close.emit();
  }

  async triggerGoogleConnect(): Promise<void> {
    await this.shiftService.connectGoogle();
  }

  triggerOpenColleagues(): void {
    this.close.emit();
    this.openColleagueManager.emit();
  }

  triggerOpenConfig(): void {
    this.close.emit();
    this.openConfig.emit();
  }

  triggerInstallPwa(): void {
    this.installPwa.emit();
  }
}

