import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Shift, DutyRole, ColleagueMetrics, Recommendation, AppConfig, SyncStatus } from '../models/shift.model';
import { GoogleAuthService } from './google-auth.service';
import { GoogleDriveSyncService } from './google-drive-sync.service';
import { HapticService } from './haptic.service';
import { ToastNotificationService, ToastType } from './toast-notification.service';
import { NetworkStatusService } from './network-status.service';
import { DutyRotationCalculatorService } from './duty-rotation-calculator.service';
import { DutyMetricsCalculatorService } from './duty-metrics-calculator.service';
import { ShiftStorageService } from './shift-storage.service';
import { formatDutyDate } from '../pipes/date-format.pipe';

@Injectable({
  providedIn: 'root',
})
export class ShiftService {
  readonly googleAuthService = inject(GoogleAuthService);
  readonly googleDriveSyncService = inject(GoogleDriveSyncService);
  private readonly hapticService = inject(HapticService);
  private readonly toastService = inject(ToastNotificationService);
  private readonly networkService = inject(NetworkStatusService);
  private readonly rotationCalculator = inject(DutyRotationCalculatorService);
  private readonly metricsCalculator = inject(DutyMetricsCalculatorService);
  private readonly storageService = inject(ShiftStorageService);

  // Reactive State Signals
  readonly shifts = signal<Shift[]>([]);
  readonly isOnline = this.networkService.isOnline;
  readonly isSyncing = signal<boolean>(false);
  readonly lastSyncTimestamp = signal<Date | null>(null);
  readonly syncError = signal<string | null>(null);
  readonly toastMessage = this.toastService.currentToast;

  // App Configuration Signal
  readonly config = signal<AppConfig>({
    currentSurgeonName: 'Cirujano de Guardia',
    autoSyncOnReconnect: true,
    hapticFeedbackEnabled: true,
    googleConnected: false,
  });

  // Computed signals
  readonly pendingSyncCount = computed(() =>
    this.shifts().filter((s) => s.syncStatus === 'pending').length
  );

  readonly colleagues = computed(() =>
    this.metricsCalculator.extractColleagues(this.shifts())
  );

  readonly sortedShifts = computed(() => {
    return [...this.shifts()].sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  });

  readonly metrics = computed<ColleagueMetrics[]>(() =>
    this.metricsCalculator.calculateMetrics(this.shifts())
  );

  constructor() {
    this.loadInitialData();
    this.setupReactivity();
  }

  /**
   * Load stored shifts and config from storage layer
   */
  private loadInitialData(): void {
    const storedConfig = this.storageService.loadConfig();
    if (storedConfig) {
      this.config.set({ ...this.config(), ...storedConfig });
      this.hapticService.setEnabled(this.config().hapticFeedbackEnabled);
    }

    const loadedShifts = this.storageService.loadShifts();
    this.shifts.set(loadedShifts);
  }

  /**
   * Setup auto-save effects and network state listeners
   */
  private setupReactivity(): void {
    // Auto-save shifts on change
    effect(() => {
      const data = this.shifts();
      this.storageService.saveShifts(data);
    });

    // Auto-save config on change & update haptics
    effect(() => {
      const cfg = this.config();
      this.storageService.saveConfig(cfg);
      this.hapticService.setEnabled(cfg.hapticFeedbackEnabled);
    });

    // React to network reconnection for auto-sync
    let wasOnline = this.networkService.isOnline();
    effect(() => {
      const online = this.networkService.isOnline();
      if (online && !wasOnline) {
        this.showToast('Conexión reestablecida. Verificando sincronización...', 'info');
        if (this.config().autoSyncOnReconnect && this.pendingSyncCount() > 0) {
          this.syncPendingShifts();
        }
      } else if (!online && wasOnline) {
        this.showToast('Sin conexión (Modo Hospital Offline activo). Datos guardados en local.', 'info');
      }
      wasOnline = online;
    });
  }

  /**
   * Compute recommendation for today's shift based on the colleague's history
   */
  getRecommendationForColleague(colleagueName: string): Recommendation {
    return this.rotationCalculator.calculateRecommendation(this.shifts(), colleagueName);
  }

  /**
   * Add and save a new duty shift
   */
  async addShift(data: { date: string; colleague: string; role: DutyRole; notes?: string }): Promise<Shift> {
    this.triggerHaptic();

    const newShift: Shift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: data.date,
      colleague: data.colleague.trim(),
      role: data.role,
      notes: data.notes?.trim() || '',
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Immediate local persistence
    this.shifts.update((current) => [newShift, ...current]);
    this.showToast(`Guardia guardada localmente (${newShift.role})`, 'success');

    // Attempt background sync if online & Google Drive connected
    if (this.isOnline() && this.googleAuthService.isConnected()) {
      this.syncSingleShift(newShift);
    }

    return newShift;
  }

  /**
   * Register a colleague with their baseline previous shift (busca & date)
   */
  async registerColleagueBaseline(colleagueName: string, role: DutyRole, date: string, notes?: string): Promise<Shift> {
    const trimmed = colleagueName.trim();
    const formattedDate = date || new Date().toISOString().split('T')[0];
    const shift = await this.addShift({
      colleague: trimmed,
      role,
      date: formattedDate,
      notes: notes || 'Historial previo inicial',
    });
    this.showToast(`Historial guardado: ${trimmed} (${role})`, 'success');
    return shift;
  }

  /**
   * Remove a colleague and all their associated shift history
   */
  removeColleagueHistory(colleagueName: string): void {
    const trimmed = colleagueName.trim().toLowerCase();
    this.shifts.update((current) => current.filter((s) => s.colleague.trim().toLowerCase() !== trimmed));
    this.showToast(`Historial de ${colleagueName} eliminado.`, 'info');
    this.triggerHaptic();
  }

  /**
   * Sync a single shift to Google Drive / Sheets API
   */
  private async syncSingleShift(shift: Shift): Promise<void> {
    if (!this.googleAuthService.isConnected()) return;

    try {
      this.isSyncing.set(true);
      const token = await this.googleAuthService.getValidToken();
      const spreadsheetId = await this.googleDriveSyncService.findOrCreateSpreadsheet(token);
      await this.googleDriveSyncService.upsertShifts(token, spreadsheetId, [shift], this.shifts());

      this.updateShiftSyncStatus(shift.id, 'synced');
      this.lastSyncTimestamp.set(new Date());
    } catch (err: unknown) {
      console.warn('Sync single shift failed (offline or Google unreachable):', err);
      this.updateShiftSyncStatus(shift.id, 'failed');
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Batch sync all pending shifts to Google Drive / Sheets API
   */
  async syncPendingShifts(): Promise<void> {
    const pending = this.shifts().filter((s) => s.syncStatus === 'pending' || s.syncStatus === 'failed');

    if (!this.googleAuthService.isConnected()) {
      this.showToast('Conecta tu Google Drive en Ajustes para sincronizar.', 'info');
      return;
    }

    if (pending.length === 0) {
      this.showToast('No hay guardias pendientes de sincronización.', 'info');
      return;
    }

    if (!this.isOnline()) {
      this.showToast('Sin conexión a internet. La sincronización esperará.', 'error');
      return;
    }

    try {
      this.isSyncing.set(true);
      this.syncError.set(null);

      const token = await this.googleAuthService.getValidToken();
      const spreadsheetId = await this.googleDriveSyncService.findOrCreateSpreadsheet(token);
      await this.googleDriveSyncService.upsertShifts(token, spreadsheetId, pending, this.shifts());

      const syncedIds = new Set(pending.map((s) => s.id));
      const nowIso = new Date().toISOString();
      this.shifts.update((current) =>
        current.map((s) =>
          syncedIds.has(s.id)
            ? { ...s, syncStatus: 'synced', remoteSyncedAt: nowIso }
            : s
        )
      );
      this.lastSyncTimestamp.set(new Date());
      this.showToast(`¡Sincronizadas ${pending.length} guardias con tu Google Drive!`, 'success');
    } catch (err: unknown) {
      console.error('Batch sync error with Google Drive:', err);
      const errMsg = err instanceof Error ? err.message : 'Error al conectar con Google Drive';
      this.syncError.set(errMsg);
      this.showToast('Error al sincronizar con Google Drive. Reintentará más tarde.', 'error');
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Connect to Google Drive, link spreadsheet, and sync initial shifts
   */
  async connectGoogle(): Promise<boolean> {
    try {
      this.triggerHaptic();
      const token = await this.googleAuthService.login();
      this.showToast('¡Conectado a Google con éxito!', 'success');

      // Ensure spreadsheet is linked and sync
      const sheetId = await this.googleDriveSyncService.findOrCreateSpreadsheet(token);
      this.updateConfig({ googleConnected: true, googleSpreadsheetId: sheetId });

      // Automatically sync shifts
      await this.fetchRemoteShifts();
      if (this.pendingSyncCount() > 0) {
        await this.syncPendingShifts();
      }
      return true;
    } catch (err: unknown) {
      console.error('Google connection error:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo completar la conexión con Google.';
      this.showToast(msg, 'error');
      return false;
    }
  }

  /**
   * Disconnect Google account and clear remote sheet reference
   */
  disconnectGoogle(): void {
    this.triggerHaptic();
    this.googleAuthService.logout();
    this.updateConfig({ googleConnected: false, googleSpreadsheetId: undefined });
    this.showToast('Cuenta de Google desconectada.', 'info');
  }

  /**
   * Fetch all remote shifts from user's Google Sheet
   */
  async fetchRemoteShifts(): Promise<void> {
    if (!this.googleAuthService.isConnected()) {
      this.showToast('Conecta tu Google Drive en Ajustes para descargar tus guardias.', 'info');
      return;
    }

    if (!this.isOnline()) {
      this.showToast('Sin conexión a internet.', 'error');
      return;
    }

    try {
      this.isSyncing.set(true);
      this.syncError.set(null);

      const token = await this.googleAuthService.getValidToken();
      const spreadsheetId = await this.googleDriveSyncService.findOrCreateSpreadsheet(token);
      const remoteShifts = await this.googleDriveSyncService.fetchRemoteShifts(token, spreadsheetId);

      // Merge remote shifts with local shifts (preserving local pending changes)
      const localMap = new Map(this.shifts().map((s) => [s.id, s]));
      for (const rem of remoteShifts) {
        if (!localMap.has(rem.id)) {
          localMap.set(rem.id, rem);
        } else {
          const existing = localMap.get(rem.id)!;
          // Only overwrite if existing was not pending
          if (existing.syncStatus !== 'pending') {
            localMap.set(rem.id, rem);
          }
        }
      }

      this.shifts.set(Array.from(localMap.values()));
      this.lastSyncTimestamp.set(new Date());
      this.showToast(`Sincronización completa: ${remoteShifts.length} guardias cargadas de Drive`, 'success');
    } catch (err: unknown) {
      console.error('Fetch remote shifts error:', err);
      const errMsg = err instanceof Error ? err.message : 'Error al obtener guardias de Google Drive';
      this.syncError.set(errMsg);
      this.showToast('Error al conectar con Google Drive.', 'error');
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Delete a shift by ID
   */
  deleteShift(id: string): void {
    this.triggerHaptic();
    this.shifts.update((current) => current.filter((s) => s.id !== id));
    this.showToast('Guardia eliminada.', 'info');
  }

  /**
   * Update sync status of a specific shift
   */
  private updateShiftSyncStatus(id: string, status: SyncStatus): void {
    this.shifts.update((current) =>
      current.map((s) =>
        s.id === id
          ? {
              ...s,
              syncStatus: status,
              remoteSyncedAt: status === 'synced' ? new Date().toISOString() : s.remoteSyncedAt,
            }
          : s
      )
    );
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AppConfig>): void {
    this.config.update((c) => ({ ...c, ...updates }));
    this.showToast('Configuración guardada.', 'success');
  }

  /**
   * Trigger haptic vibration on tactile devices
   */
  triggerHaptic(pattern: number | number[] = 40): void {
    this.hapticService.trigger(pattern);
  }

  /**
   * Display temporary toast notification
   */
  showToast(text: string, type: ToastType = 'info'): void {
    this.toastService.show(text, type);
  }

  /**
   * Reset all shift data to a clean slate
   */
  resetData(): void {
    this.shifts.set([]);
    this.storageService.clearShifts();
    this.showToast('Historial de guardias vaciado correctamente.', 'info');
    this.triggerHaptic();
  }

  /**
   * Format ISO date string into readable Spanish format
   */
  formatDisplayDate(isoDate: string): string {
    return formatDutyDate(isoDate);
  }
}
