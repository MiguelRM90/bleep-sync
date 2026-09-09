import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { DutyRole } from '../../models/shift.model';

@Component({
  selector: 'app-duty-logger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duty-logger.component.html',
})
export class DutyLoggerComponent {
  readonly shiftService = inject(ShiftService);

  date = new Date().toISOString().split('T')[0];
  colleague = '';
  notes = '';
  readonly role = signal<DutyRole | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly justSaved = signal<boolean>(false);

  canSave(): boolean {
    return !!this.date && !!this.colleague.trim() && this.role() !== null;
  }

  selectRole(newRole: DutyRole): void {
    this.role.set(newRole);
    this.shiftService.triggerHaptic();
  }

  setColleagueFromChecker(name: string): void {
    this.colleague = name;
  }

  setPreselection(colleague: string, role: DutyRole): void {
    this.colleague = colleague;
    this.role.set(role);
  }

  async saveShift(): Promise<void> {
    if (!this.canSave()) return;

    this.isSubmitting.set(true);

    try {
      await this.shiftService.addShift({
        date: this.date,
        colleague: this.colleague,
        role: this.role()!,
        notes: this.notes,
      });

      this.justSaved.set(true);
      this.notes = '';

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
