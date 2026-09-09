import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { GAS_CODE_GS } from '../../constants/gas-code.constant';

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
  isGasCodeCopied = signal<boolean>(false);

  gasUrl = this.shiftService.config().gasEndpointUrl;
  gasApiKey = this.shiftService.config().gasApiKey || '';
  surgeonName = this.shiftService.config().currentSurgeonName;
  hapticEnabled = this.shiftService.config().hapticFeedbackEnabled;
  autoSync = this.shiftService.config().autoSyncOnReconnect;

  closeOnBackdrop(event: MouseEvent): void {
    this.close.emit();
  }

  async copyGasCode(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(GAS_CODE_GS);
        this.isGasCodeCopied.set(true);
        this.shiftService.showToast('¡Código de gas/Code.gs copiado al portapapeles! Listo para pegar en Google.', 'success');
        this.shiftService.triggerHaptic();
        setTimeout(() => {
          this.isGasCodeCopied.set(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to copy GAS code to clipboard:', err);
      this.shiftService.showToast('Error al copiar al portapapeles.', 'error');
    }
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
