import { Injectable } from '@angular/core';
import { Shift, AppConfig } from '../models/shift.model';

export const STORAGE_KEY_SHIFTS = 'bleepsync_shifts_v1';
export const STORAGE_KEY_CONFIG = 'bleepsync_config_v1';

@Injectable({
  providedIn: 'root',
})
export class ShiftStorageService {
  /**
   * Load saved shifts from browser storage safely
   */
  loadShifts(): Shift[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_SHIFTS);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error('Failed to load shifts from localStorage:', err);
      return [];
    }
  }

  /**
   * Save shifts to browser storage
   */
  saveShifts(shifts: Shift[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    } catch (err) {
      console.error('Failed to save shifts to localStorage:', err);
    }
  }

  /**
   * Clear shifts from storage
   */
  clearShifts(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.removeItem(STORAGE_KEY_SHIFTS);
    } catch (err) {
      console.error('Failed to clear shifts from localStorage:', err);
    }
  }

  /**
   * Load app config from browser storage
   */
  loadConfig(): Partial<AppConfig> | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('Failed to load config from localStorage:', err);
      return null;
    }
  }

  /**
   * Save app config to browser storage
   */
  saveConfig(config: AppConfig): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save config to localStorage:', err);
    }
  }
}

