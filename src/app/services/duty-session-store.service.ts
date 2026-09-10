import { Injectable, signal } from '@angular/core';
import { DutyRole } from '../models/shift.model';

@Injectable({
  providedIn: 'root',
})
export class DutySessionStoreService {
  /**
   * The currently active colleague for today's duty check and logging
   */
  readonly activeColleague = signal<string>('');

  /**
   * The selected duty role for logging today's shift
   */
  readonly activeRole = signal<DutyRole | null>(null);

  /**
   * The selected shift date (ISO string YYYY-MM-DD)
   */
  readonly activeDate = signal<string>(new Date().toISOString().split('T')[0]);

  /**
   * Optional notes for the shift
   */
  readonly activeNotes = signal<string>('');

  /**
   * Set colleague across both checker and logger components
   */
  setActiveColleague(colleague: string): void {
    this.activeColleague.set(colleague.trim());
  }

  /**
   * Set duty role
   */
  setActiveRole(role: DutyRole | null): void {
    this.activeRole.set(role);
  }

  /**
   * Set shift date
   */
  setActiveDate(date: string): void {
    this.activeDate.set(date);
  }

  /**
   * Set notes
   */
  setActiveNotes(notes: string): void {
    this.activeNotes.set(notes);
  }

  /**
   * Apply an automated recommendation to the active session
   */
  applyRecommendation(colleague: string, role: DutyRole): void {
    this.activeColleague.set(colleague.trim());
    this.activeRole.set(role);
  }

  /**
   * Reset the form after a successful save while keeping date
   */
  resetAfterSave(): void {
    this.activeRole.set(null);
    this.activeNotes.set('');
  }
}

