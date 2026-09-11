import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { GoogleAuthService } from '../../services/google-auth.service';
import { GoogleDriveSyncService } from '../../services/google-drive-sync.service';
import { ToastNotificationService } from '../../services/toast-notification.service';
import { ModalComponent } from '../ui/modal/modal.component';

@Component({
  selector: 'app-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './config-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigModalComponent {
  readonly shiftService = inject(ShiftService);
  readonly googleAuth = inject(GoogleAuthService);
  readonly googleDriveSync = inject(GoogleDriveSyncService);
  private readonly toastService = inject(ToastNotificationService);

  readonly close = output<void>();
  readonly openColleagueManager = output<void>();
  readonly openTutorial = output<void>();

  surgeonName = this.shiftService.config().currentSurgeonName;
  hapticEnabled = this.shiftService.config().hapticFeedbackEnabled;
  autoSync = this.shiftService.config().autoSyncOnReconnect;

  async connectGoogle(): Promise<void> {
    await this.shiftService.connectGoogle();
  }

  disconnectGoogle(): void {
    if (confirm('¿Deseas desconectar tu cuenta de Google Drive? Tus guardias guardadas en el móvil no se borrarán.')) {
      this.shiftService.disconnectGoogle();
    }
  }

  openSheetInDrive(): void {
    const url = this.googleDriveSync.sheetUrl();
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      this.toastService.show('Aún no se ha creado la hoja en Drive. Pulsa Sincronizar.', 'info');
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

  readonly isDeleting = signal<boolean>(false);

  async clearAllData(): Promise<void> {
    const isDriveConnected = this.googleAuth.isConnected();
    const confirmMessage = isDriveConnected
      ? '⚠️ ¡ATENCIÓN! ACCIÓN IRREVERSIBLE ⚠️\n\n' +
        '¿Estás seguro de que deseas ELIMINAR TODOS LOS DATOS?\n\n' +
        '• Se borrarán todas las guardias en este dispositivo.\n' +
        '• Se vaciarán TODAS las filas de tu hoja en Google Drive ("Guardias BleepSync").\n' +
        '• Se restablecerán las estadísticas y el historial de rotación de adjuntos.\n\n' +
        'Esta acción NO se puede deshacer.\n\n' +
        '¿Deseas proceder con el borrado total?'
      : '⚠️ ¡ATENCIÓN! ACCIÓN IRREVERSIBLE ⚠️\n\n' +
        '¿Estás seguro de que deseas ELIMINAR TODAS LAS GUARDIAS?\n\n' +
        '• Se borrarán todas las guardias guardadas en este dispositivo.\n' +
        '• Se restablecerán las estadísticas y el historial de rotación de adjuntos.\n\n' +
        'Esta acción NO se puede deshacer.\n\n' +
        '¿Deseas proceder con el borrado total?';

    if (!confirm(confirmMessage)) return;

    this.isDeleting.set(true);
    try {
      await this.shiftService.resetData();
      this.close.emit();
    } finally {
      this.isDeleting.set(false);
    }
  }
}
