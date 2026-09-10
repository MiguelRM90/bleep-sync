import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { HapticService } from '../../services/haptic.service';
import { DutySessionStoreService } from '../../services/duty-session-store.service';
import { DutyRole } from '../../models/shift.model';

@Component({
  selector: 'app-duty-logger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duty-logger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DutyLoggerComponent {
  readonly shiftService = inject(ShiftService);
  private readonly hapticService = inject(HapticService);
  readonly sessionStore = inject(DutySessionStoreService);

  readonly isSubmitting = signal<boolean>(false);
  readonly justSaved = signal<boolean>(false);

  // Expose signals from sessionStore for direct template binding
  get date(): string {
    return this.sessionStore.activeDate();
  }
  set date(val: string) {
    this.sessionStore.setActiveDate(val);
  }

  get colleague(): string {
    return this.sessionStore.activeColleague();
  }
  set colleague(val: string) {
    this.sessionStore.setActiveColleague(val);
  }

  get notes(): string {
    return this.sessionStore.activeNotes();
  }
  set notes(val: string) {
    this.sessionStore.setActiveNotes(val);
  }

  readonly role = this.sessionStore.activeRole;

  canSave(): boolean {
    return (
      !!this.sessionStore.activeDate() &&
      !!this.sessionStore.activeColleague().trim() &&
      this.sessionStore.activeRole() !== null
    );
  }

  selectRole(newRole: DutyRole): void {
    this.sessionStore.setActiveRole(newRole);
    this.hapticService.trigger();
  }

  // Backward-compatibility delegation methods
  setColleagueFromChecker(name: string): void {
    this.sessionStore.setActiveColleague(name);
  }

  setPreselection(colleague: string, role: DutyRole): void {
    this.sessionStore.applyRecommendation(colleague, role);
  }

  async saveShift(): Promise<void> {
    if (!this.canSave()) return;

    this.isSubmitting.set(true);

    try {
      await this.shiftService.addShift({
        date: this.sessionStore.activeDate(),
        colleague: this.sessionStore.activeColleague(),
        role: this.sessionStore.activeRole()!,
        notes: this.sessionStore.activeNotes(),
      });

      this.justSaved.set(true);
      this.sessionStore.resetAfterSave();

      setTimeout(() => {
        this.justSaved.set(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to save shift:', err);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
