import { Injectable, signal, computed, effect } from '@angular/core';
import { Shift, DutyRole, ColleagueMetrics, Recommendation, AppConfig, SyncStatus } from '../models/shift.model';

const STORAGE_KEY_SHIFTS = 'bleepsync_shifts_v1';
const STORAGE_KEY_CONFIG = 'bleepsync_config_v1';

@Injectable({
  providedIn: 'root',
})
export class ShiftService {
  // Reactive Signals for primary state
  readonly shifts = signal<Shift[]>([]);
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly isSyncing = signal<boolean>(false);
  readonly lastSyncTimestamp = signal<Date | null>(null);
  readonly syncError = signal<string | null>(null);
  readonly toastMessage = signal<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // App Configuration Signal
  readonly config = signal<AppConfig>({
    gasEndpointUrl: '',
    gasApiKey: '',
    currentSurgeonName: 'Cirujano de Guardia',
    autoSyncOnReconnect: true,
    hapticFeedbackEnabled: true,
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
        // Primera instalación: iniciar con historial limpio para la doctora
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

    // Attempt background sync if online & backend configured
    if (this.isOnline() && this.config().gasEndpointUrl) {
      this.syncSingleShift(newShift);
    }

    return newShift;
  }

  /**
   * Sync a single shift to Google Apps Script
   */
  private async syncSingleShift(shift: Shift): Promise<void> {
    const url = this.config().gasEndpointUrl.trim();
    if (!url) return;

    try {
      this.isSyncing.set(true);
      const apiKey = this.config().gasApiKey?.trim() || undefined;
      // Google Apps Script requires text/plain and redirect: 'follow' to avoid CORS preflight
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          apiKey,
          action: 'create_shift',
          payload: shift,
        }),
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      if (result && (result.status === 'success' || result.status === 'ok')) {
        this.updateShiftSyncStatus(shift.id, 'synced');
        this.lastSyncTimestamp.set(new Date());
      } else if (result?.errorType === 'unauthorized' || result?.status === 'unauthorized') {
        throw new Error('Clave de seguridad no válida en Google Apps Script.');
      } else {
        throw new Error(result?.message || 'Error en respuesta de Google Apps Script');
      }
    } catch (err: any) {
      console.warn('Sync failed (offline or GAS unreachable):', err);
      this.updateShiftSyncStatus(shift.id, 'failed');
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Batch sync all pending shifts to Google Apps Script
   */
  async syncPendingShifts(): Promise<void> {
    const pending = this.shifts().filter((s) => s.syncStatus === 'pending' || s.syncStatus === 'failed');
    const url = this.config().gasEndpointUrl.trim();

    if (pending.length === 0) {
      this.showToast('No hay guardias pendientes de sincronización.', 'info');
      return;
    }

    if (!url) {
      this.showToast('URL de Google Apps Script no configurada.', 'error');
      return;
    }

    if (!this.isOnline()) {
      this.showToast('Sin conexión a internet. La sincronización esperará.', 'error');
      return;
    }

    try {
      this.isSyncing.set(true);
      this.syncError.set(null);

      const apiKey = this.config().gasApiKey?.trim() || undefined;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          apiKey,
          action: 'batch_sync',
          payload: pending,
        }),
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      if (result && (result.status === 'success' || result.status === 'ok')) {
        // Mark all sent shifts as synced
        const syncedIds = new Set(pending.map((s) => s.id));
        this.shifts.update((current) =>
          current.map((s) =>
            syncedIds.has(s.id)
              ? { ...s, syncStatus: 'synced', remoteSyncedAt: new Date().toISOString() }
              : s
          )
        );
        this.lastSyncTimestamp.set(new Date());
        this.showToast(`¡Sincronizadas ${pending.length} guardias con Google Sheets!`, 'success');
      } else if (result?.errorType === 'unauthorized' || result?.status === 'unauthorized') {
        throw new Error('Clave de seguridad inválida en Google Apps Script.');
      } else {
        throw new Error(result?.message || 'Respuesta inválida de Google Apps Script');
      }
    } catch (err: any) {
      console.error('Batch sync error:', err);
      this.syncError.set(err?.message || 'Error al conectar con Google Sheets');
      this.showToast('Error al sincronizar con Google Sheets. Reintentará más tarde.', 'error');
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Fetch all remote shifts from Google Sheets via doGet(e)
   */
  async fetchRemoteShifts(): Promise<void> {
    const url = this.config().gasEndpointUrl.trim();
    if (!url) {
      this.showToast('Configura la URL de Apps Script antes de sincronizar.', 'error');
      return;
    }

    try {
      this.isSyncing.set(true);
      this.syncError.set(null);

      const apiKey = this.config().gasApiKey?.trim();
      const queryParams = ['t=' + Date.now()];
      if (apiKey) {
        queryParams.push('apiKey=' + encodeURIComponent(apiKey));
      }
      const fetchUrl = url + (url.includes('?') ? '&' : '?') + queryParams.join('&');
      const response = await fetch(fetchUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result && result.status === 'success' && Array.isArray(result.data)) {
        const remoteShifts: Shift[] = result.data.map((item: any) => ({
          id: item.id || 'remote_' + item.date + '_' + Math.random().toString(36).substring(2, 6),
          date: item.date,
          colleague: item.colleague,
          role: item.role as DutyRole,
          notes: item.notes || '',
          syncStatus: 'synced' as SyncStatus,
          createdAt: item.createdAt || new Date().toISOString(),
          remoteSyncedAt: new Date().toISOString(),
        }));

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
        this.showToast(`Sincronización completa: ${remoteShifts.length} guardias cargadas`, 'success');
      } else if (result?.errorType === 'unauthorized' || result?.status === 'unauthorized') {
        throw new Error('Clave de seguridad inválida en Google Apps Script.');
      } else {
        throw new Error(result?.message || 'Formato de datos no reconocido');
      }
    } catch (err: any) {
      console.error('Fetch remote shifts error:', err);
      this.syncError.set(err?.message || 'Error al obtener guardias de Google Sheets');
      this.showToast('Error al conectar con Google Sheets.', 'error');
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
   * Reset all data to empty or demo
   */
  resetData(): void {
    this.seedInitialDemoData();
    this.showToast('Datos de demostración restablecidos.', 'info');
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

