import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';

@Component({
  selector: 'app-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config-modal.component.html',
})
export class ConfigModalComponent {
  readonly shiftService = inject(ShiftService);
  readonly close = output<void>();

  showGuide = signal<boolean>(false);

  gasUrl = this.shiftService.config().gasEndpointUrl;
  gasApiKey = this.shiftService.config().gasApiKey || '';
  surgeonName = this.shiftService.config().currentSurgeonName;
  hapticEnabled = this.shiftService.config().hapticFeedbackEnabled;
  autoSync = this.shiftService.config().autoSyncOnReconnect;

  closeOnBackdrop(event: MouseEvent): void {
    this.close.emit();
  }

  saveConfiguration(): void {
    this.shiftService.updateConfig({
      gasEndpointUrl: this.gasUrl.trim(),
      gasApiKey: this.gasApiKey.trim(),
      currentSurgeonName: this.surgeonName.trim() || 'Cirujano de Guardia',
      hapticFeedbackEnabled: this.hapticEnabled,
      autoSyncOnReconnect: this.autoSync,
    });
    this.close.emit();
  }

  syncPending(): void {
    this.shiftService.syncPendingShifts();
  }

  fetchRemote(): void {
    this.shiftService.fetchRemoteShifts();
  }

  restoreDemoData(): void {
    if (confirm('¿Cargar conjunto de guardias de demostración?')) {
      this.shiftService.resetData();
    }
  }

  clearAllData(): void {
    if (confirm('¿Estás seguro de que deseas eliminar todas las guardias locales? Esta acción no se puede deshacer.')) {
      this.shiftService.shifts.set([]);
      this.shiftService.showToast('Base de datos local vaciada.', 'info');
    }
  }
}
