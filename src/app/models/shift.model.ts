/**
 * BleepSync - Shift and Duty Domain Models
 */

export type DutyRole = 'Planta' | 'Urgencias' | 'Ambos';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface Shift {
  id: string;
  date: string; // ISO date string: YYYY-MM-DD
  colleague: string; // Attending Physician name ("Adjunto")
  role: DutyRole; // Assigned duty pager
  notes?: string; // Optional context (swaps, favors, comments)
  syncStatus: SyncStatus;
  createdAt: string; // ISO timestamp
  remoteSyncedAt?: string;
}

export interface ColleagueMetrics {
  colleague: string;
  totalShifts: number;
  plantaCount: number;
  urgenciasCount: number;
  ambosCount: number;
  lastShiftDate?: string;
  lastRole?: DutyRole;
  plantaPercentage: number;
  urgenciasPercentage: number;
  imbalanceWarning: boolean; // True if ratio is significantly skewed (>65% on one side with at least 3 shifts)
}

export interface Recommendation {
  recommendedRole: DutyRole | null;
  reason: string;
  lastShift?: Shift;
  requiresManualSelection: boolean;
}

export interface AppConfig {
  currentSurgeonName: string;
  autoSyncOnReconnect: boolean;
  hapticFeedbackEnabled: boolean;
  googleConnected: boolean;
  googleUserEmail?: string;
  googleUserName?: string;
  googleUserPicture?: string;
  googleSpreadsheetId?: string;
}

