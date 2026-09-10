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

  readonly showPrivacyDetails = signal<boolean>(false);

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

  clearAllData(): void {
    if (confirm('¿Estás seguro de que deseas vaciar todas las guardias locales? Esta acción no se puede deshacer.')) {
      this.shiftService.resetData();
    }
  }
}
