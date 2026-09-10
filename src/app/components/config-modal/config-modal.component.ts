import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import { GoogleDriveSyncService } from '../../services/google-drive-sync.service';

@Component({
  selector: 'app-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config-modal.component.html',
})
export class ConfigModalComponent {
  readonly shiftService = inject(ShiftService);
  readonly googleAuth = inject(GoogleAuthService);
  readonly googleDriveSync = inject(GoogleDriveSyncService);
  readonly close = output<void>();

  showPrivacyDetails = signal<boolean>(false);

  surgeonName = this.shiftService.config().currentSurgeonName;
  hapticEnabled = this.shiftService.config().hapticFeedbackEnabled;
  autoSync = this.shiftService.config().autoSyncOnReconnect;

  closeOnBackdrop(event: MouseEvent): void {
    this.close.emit();
  }

  async connectGoogle(): Promise<void> {
    try {
      this.shiftService.triggerHaptic();
      const token = await this.googleAuth.login();
      this.shiftService.showToast('¡Conectado a Google con éxito!', 'success');

      // Ensure spreadsheet is linked and sync
      const sheetId = await this.googleDriveSync.findOrCreateSpreadsheet(token);
      this.shiftService.updateConfig({ googleConnected: true, googleSpreadsheetId: sheetId });

      // Automatically sync shifts
      await this.shiftService.fetchRemoteShifts();
      if (this.shiftService.pendingSyncCount() > 0) {
        await this.shiftService.syncPendingShifts();
      }
    } catch (err: unknown) {
      console.error('Google connection error:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo completar la conexión con Google.';
      this.shiftService.showToast(msg, 'error');
    }
  }

  disconnectGoogle(): void {
    if (confirm('¿Deseas desconectar tu cuenta de Google Drive? Tus guardias guardadas en el móvil no se borrarán.')) {
      this.shiftService.triggerHaptic();
      this.googleAuth.logout();
      this.shiftService.updateConfig({ googleConnected: false, googleSpreadsheetId: undefined });
      this.shiftService.showToast('Cuenta de Google desconectada.', 'info');
    }
  }

  openSheetInDrive(): void {
    const url = this.googleDriveSync.sheetUrl();
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      this.shiftService.showToast('Aún no se ha creado la hoja en Drive. Pulsa Sincronizar.', 'info');
    }
  }

  saveConfiguration(): void {
    this.shiftService.updateConfig({
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
