import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Shift, DutyRole, ColleagueMetrics, Recommendation, AppConfig, SyncStatus } from '../models/shift.model';
import { GoogleAuthService } from './google-auth.service';
import { GoogleDriveSyncService } from './google-drive-sync.service';

const STORAGE_KEY_SHIFTS = 'bleepsync_shifts_v1';
const STORAGE_KEY_CONFIG = 'bleepsync_config_v1';

@Injectable({
  providedIn: 'root',
})
export class ShiftService {
  readonly googleAuthService = inject(GoogleAuthService);
  readonly googleDriveSyncService = inject(GoogleDriveSyncService);

  // Reactive Signals for primary state
  readonly shifts = signal<Shift[]>([]);
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly isSyncing = signal<boolean>(false);
  readonly lastSyncTimestamp = signal<Date | null>(null);
  readonly syncError = signal<string | null>(null);
  readonly toastMessage = signal<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

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

  readonly colleagues = computed(() => {
    const list = new Set<string>();
    for (const shift of this.shifts()) {
      if (shift.colleague?.trim()) {
        list.add(shift.colleague.trim());
      }
    }
    return Array.from(list).sort((a, b) => a.localeCompare(b, 'es'));
  });

  readonly sortedShifts = computed(() => {
    return [...this.shifts()].sort((a, b) => {
      // Primary: date desc; Secondary: createdAt desc
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      return b.createdAt.localeCompare(a.createdAt);
    });
  });

  readonly metrics = computed<ColleagueMetrics[]>(() => {
    const map = new Map<string, Shift[]>();
    for (const shift of this.shifts()) {
      const name = shift.colleague.trim();
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(shift);
    }

    const result: ColleagueMetrics[] = [];
    for (const [colleague, shifts] of map.entries()) {
      // Sort shifts descending to find last
      const sorted = [...shifts].sort((a, b) => b.date.localeCompare(a.date));
      const total = shifts.length;
      const planta = shifts.filter((s) => s.role === 'Planta').length;
      const urgencias = shifts.filter((s) => s.role === 'Urgencias').length;
      const ambos = shifts.filter((s) => s.role === 'Ambos').length;

      const plantaPct = total > 0 ? Math.round((planta / total) * 100) : 0;
      const urgenciasPct = total > 0 ? Math.round((urgencias / total) * 100) : 0;

      // Flag imbalance if 3 or more shifts and difference between planta and urgencias > 40%
      const imbalanceWarning = total >= 3 && Math.abs(plantaPct - urgenciasPct) >= 40;

      result.push({
        colleague,
        totalShifts: total,
        plantaCount: planta,
        urgenciasCount: urgencias,
        ambosCount: ambos,
        lastShiftDate: sorted[0]?.date,
        lastRole: sorted[0]?.role,
        plantaPercentage: plantaPct,
        urgenciasPercentage: urgenciasPct,
        imbalanceWarning,
      });
    }

    return result.sort((a, b) => b.totalShifts - a.totalShifts);
  });

  constructor() {
    this.loadInitialData();
    this.setupNetworkListeners();

    // Auto-save shifts to LocalStorage whenever shifts signal changes
    effect(() => {
      const data = this.shifts();
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(data));
      }
    });

    // Auto-save configuration whenever config signal changes
    effect(() => {
      const cfg = this.config();
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
      }
    });
  }

  /**
   * Load data and configuration from local storage on bootstrap
   */
  private loadInitialData(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const storedCfg = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (storedCfg) {
        this.config.set({ ...this.config(), ...JSON.parse(storedCfg) });
      }

      const storedShifts = localStorage.getItem(STORAGE_KEY_SHIFTS);
      if (storedShifts) {
        const parsed: Shift[] = JSON.parse(storedShifts);
        this.shifts.set(parsed);
      } else {
        // Initial installation: start with a clean duty history for the surgeon
        this.shifts.set([]);
      }
    } catch (err) {
      console.error('Failed to load initial data from localStorage:', err);
    }
  }

  /**
   * Listen to browser online/offline events for real-time status and sync
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.showToast('Conexión reestablecida. Verificando sincronización...', 'info');
      if (this.config().autoSyncOnReconnect && this.pendingSyncCount() > 0) {
        this.syncPendingShifts();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.showToast('Sin conexión (Modo Hospital Offline activo). Datos guardados en local.', 'info');
    });
  }

  /**
   * Compute recommendation for today's shift based on the colleague's history
   */
  getRecommendationForColleague(colleagueName: string): Recommendation {
    const trimmed = colleagueName.trim();
    if (!trimmed) {
      return {
        recommendedRole: null,
        reason: 'Selecciona un adjunto de guardia para calcular la rotación recomendada.',
        requiresManualSelection: true,
      };
    }

    // Filter shifts for this colleague and sort newest first
    const history = this.shifts()
      .filter((s) => s.colleague.trim().toLowerCase() === trimmed.toLowerCase())
      .sort((a, b) => {
        const d = b.date.localeCompare(a.date);
        return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt);
      });

    if (history.length === 0) {
      return {
        recommendedRole: null,
        reason: `Primera guardia con ${trimmed}. Selecciona manualmente tu asignación para iniciar el balance.`,
        requiresManualSelection: true,
      };
    }

    const lastShift = history[0];
    if (lastShift.role === 'Planta') {
      return {
        recommendedRole: 'Urgencias',
        reason: `En la última guardia juntos (${this.formatDisplayDate(lastShift.date)}) estuviste en Planta. Hoy corresponde URGENCIAS para rotar equitativamente.`,
        lastShift,
        requiresManualSelection: false,
      };
    } else if (lastShift.role === 'Urgencias') {
      return {
        recommendedRole: 'Planta',
        reason: `En la última guardia juntos (${this.formatDisplayDate(lastShift.date)}) estuviste en Urgencias. Hoy corresponde PLANTA para rotar equitativamente.`,
        lastShift,
        requiresManualSelection: false,
      };
    } else {
      // Ambos / Exception
      return {
        recommendedRole: null,
        reason: `La guardia anterior fue de asignación mixta (Ambos). Elige manualmente la de hoy.`,
        lastShift,
        requiresManualSelection: true,
      };
    }
  }

  /**
   * Add and save a new duty shift
   * Tactile feedback + immediate offline-first storage + optional background sync
   */
  async addShift(data: { date: string; colleague: string; role: DutyRole; notes?: string }): Promise<Shift> {
    this.triggerHaptic();

    const newShift: Shift = {
      id: 'shift_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
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
  triggerHaptic(): void {
    if (this.config().hapticFeedbackEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40]);
      } catch (e) {
        // Silently catch if not permitted by browser policy
      }
    }
  }

  /**
   * Display temporary toast notification
   */
  showToast(text: string, type: 'success' | 'info' | 'error' = 'info'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      // Clear if still the same message
      if (this.toastMessage()?.text === text) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }

  /**
   * Seed realistic sample data for hospital on-call surgeons
   */
  seedInitialDemoData(): void {
    const today = new Date();
    const formatDate = (daysAgo: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    const demoShifts: Shift[] = [
      {
        id: 'shift_demo_1',
        date: formatDate(3),
        colleague: 'Dra. Carmen Navarro',
        role: 'Planta',
        notes: 'Interconsulta compleja en planta 4ª de traumatología y digestivo.',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: 'shift_demo_2',
        date: formatDate(7),
        colleague: 'Dr. Alejandro Ruiz',
        role: 'Urgencias',
        notes: 'Apendicectomía laparoscópica a las 03:30 AM. Mucho volumen en urgencias.',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: 'shift_demo_3',
        date: formatDate(12),
        colleague: 'Dra. Elena Ramos',
        role: 'Urgencias',
        notes: 'Cambio de guardia con Santos por congreso SECIR.',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
      {
        id: 'shift_demo_4',
        date: formatDate(16),
        colleague: 'Dr. Marcos Santos',
        role: 'Planta',
        notes: 'Pase de visita matinal en UCI y camas de cirugía vascular.',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 16 * 86400000).toISOString(),
      },
      {
        id: 'shift_demo_5',
        date: formatDate(21),
        colleague: 'Dra. Carmen Navarro',
        role: 'Urgencias',
        notes: 'Rotación estándar de fin de semana.',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
      },
      {
        id: 'shift_demo_6',
        date: formatDate(26),
        colleague: 'Dr. Alejandro Ruiz',
        role: 'Planta',
        notes: 'Guardia tranquila en planta.',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 26 * 86400000).toISOString(),
      },
      {
        id: 'shift_demo_7',
        date: formatDate(30),
        colleague: 'Dra. Carmen Navarro',
        role: 'Planta',
        notes: 'Guardia de festivo.',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: 'shift_demo_8',
        date: formatDate(35),
        colleague: 'Dr. Marcos Santos',
        role: 'Ambos',
        notes: 'Baja imprevista del segundo adjunto; cobertura conjunta de toda la guardia.',
        syncStatus: 'synced',
        createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
      },
    ];

    this.shifts.set(demoShifts);
  }

  /**
   * Reset all shift data to a clean slate
   */
  resetData(): void {
    this.shifts.set([]);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY_SHIFTS);
    }
    this.showToast('Historial de guardias vaciado correctamente.', 'info');
    this.triggerHaptic();
  }

  /**
   * Format ISO date string into readable Spanish format
   */
  formatDisplayDate(isoDate: string): string {
    if (!isoDate) return '';
    try {
      const [y, m, d] = isoDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  }
}

