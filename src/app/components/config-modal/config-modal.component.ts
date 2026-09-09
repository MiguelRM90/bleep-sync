import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';

@Component({
  selector: 'app-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop overlay -->
    <div
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      (click)="closeOnBackdrop($event)"
    >
      <div
        class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100">Configuración & Nube</h3>
              <p class="text-xs text-slate-400">Google Apps Script & Preferencias</p>
            </div>
          </div>

          <button
            type="button"
            (click)="close.emit()"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition tactile-btn"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div class="p-5 overflow-y-auto space-y-5 text-sm">
          <!-- Google Apps Script URL input -->
          <div class="space-y-1.5">
            <label for="gasUrlInput" class="block font-semibold text-slate-200 text-xs uppercase tracking-wider">
              URL del Web App (Google Apps Script)
            </label>
            <input
              type="url"
              id="gasUrlInput"
              [(ngModel)]="gasUrl"
              placeholder="https://script.google.com/macros/s/.../exec"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition"
            />
            <p class="text-[11px] text-slate-400">
              Despliega el archivo <code class="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">gas/Code.gs</code> en Google Apps Script y pega la URL de ejecución aquí.
            </p>
          </div>

          <!-- Google Apps Script API Key input -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label for="gasApiKeyInput" class="block font-semibold text-slate-200 text-xs uppercase tracking-wider">
                Clave de Seguridad (API Key / Token)
              </label>
              <span class="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                Protección Privada
              </span>
            </div>
            <input
              type="password"
              id="gasApiKeyInput"
              [(ngModel)]="gasApiKey"
              placeholder="Clave secreta configurada en Code.gs"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition"
            />
            <p class="text-[11px] text-slate-400">
              Evita accesos no autorizados a tu Google Sheet. Si definiste <code class="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">API_KEY</code> en Apps Script, indícala aquí.
            </p>
          </div>

          <!-- Cloud Sync Actions -->
          <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
            <span class="text-xs font-semibold text-slate-300 block">Acciones de Sincronización</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                (click)="syncPending()"
                [disabled]="shiftService.isSyncing() || !gasUrl.trim()"
                class="px-3 py-2 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn"
              >
                @if (shiftService.isSyncing()) {
                  <span class="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                } @else {
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                }
                Subir pendientes ({{ shiftService.pendingSyncCount() }})
              </button>

              <button
                type="button"
                (click)="fetchRemote()"
                [disabled]="shiftService.isSyncing() || !gasUrl.trim()"
                class="px-3 py-2 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/40 text-xs font-semibold hover:bg-sky-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Descargar de Google Sheet
              </button>
            </div>
          </div>

          <!-- Surgeon Profile Name -->
          <div class="space-y-1.5">
            <label for="surgeonNameInput" class="block font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Nombre del Cirujano / Usuario
            </label>
            <input
              type="text"
              id="surgeonNameInput"
              [(ngModel)]="surgeonName"
              placeholder="Ej: Dr. García / Cirujano On-Call"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
            />
          </div>

          <!-- Preferences Toggles -->
          <div class="space-y-3 pt-2">
            <span class="text-xs font-semibold text-slate-300 block">Opciones de Dispositivo</span>

            <!-- Haptic toggle -->
            <label class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
              <div>
                <span class="text-xs font-medium text-slate-200 block">Respuesta Háptica (Vibración)</span>
                <span class="text-[11px] text-slate-400">Vibración táctil al registrar y seleccionar guardia</span>
              </div>
              <input
                type="checkbox"
                [(ngModel)]="hapticEnabled"
                class="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
            </label>

            <!-- Auto-sync toggle -->
            <label class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer">
              <div>
                <span class="text-xs font-medium text-slate-200 block">Autosincronización al volver online</span>
                <span class="text-[11px] text-slate-400">Sube automáticamente las guardias guardadas en zonas sin cobertura</span>
              </div>
              <input
                type="checkbox"
                [(ngModel)]="autoSync"
                class="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
            </label>
          </div>

          <!-- Demo & Reset Section -->
          <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              (click)="restoreDemoData()"
              class="text-xs text-emerald-400 hover:text-emerald-300 font-medium py-1 px-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 transition tactile-btn"
            >
              Restaurar datos de prueba
            </button>

            <button
              type="button"
              (click)="clearAllData()"
              class="text-xs text-rose-400 hover:text-rose-300 font-medium py-1 px-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 transition tactile-btn"
            >
              Borrar base local
            </button>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            (click)="close.emit()"
            class="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition tactile-btn"
          >
            Cerrar
          </button>
          <button
            type="button"
            (click)="saveConfiguration()"
            class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-950/40 transition tactile-btn"
          >
            Guardar Ajustes
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfigModalComponent {
  readonly shiftService = inject(ShiftService);
  readonly close = output<void>();

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

