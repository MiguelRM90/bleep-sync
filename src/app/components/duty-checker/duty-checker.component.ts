import { Component, inject, signal, computed, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { DutyRole } from '../../models/shift.model';

@Component({
  selector: 'app-duty-checker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duty-checker.component.html',
})
export class DutyCheckerComponent {
  readonly shiftService = inject(ShiftService);

  readonly colleagueChange = output<string>();
  readonly recommendationApplied = output<{ colleague: string; role: DutyRole }>();
  readonly openColleagueManager = output<void>();

  readonly selectedColleague = signal<string>('');
  readonly showAddColleagueInput = signal<boolean>(false);
  newColleagueName = '';

  readonly recommendation = computed(() => {
    return this.shiftService.getRecommendationForColleague(this.selectedColleague());
  });

  constructor() {
    // Default to the first colleague in the roster if available
    effect(() => {
      const list = this.shiftService.colleagues();
      if (list.length > 0 && !this.selectedColleague()) {
        this.selectedColleague.set(list[0]);
        this.colleagueChange.emit(list[0]);
      }
    });
  }

  onColleagueSelect(colleague: string): void {
    this.selectedColleague.set(colleague);
    this.colleagueChange.emit(colleague);
    this.shiftService.triggerHaptic();
  }

  selectColleagueDirectly(colleague: string): void {
    this.selectedColleague.set(colleague);
    this.colleagueChange.emit(colleague);
    this.shiftService.triggerHaptic();
  }

  toggleAddColleague(): void {
    this.showAddColleagueInput.update((v) => !v);
    this.newColleagueName = '';
  }

  addNewColleague(): void {
    const trimmed = this.newColleagueName.trim();
    if (trimmed) {
      this.selectedColleague.set(trimmed);
      this.colleagueChange.emit(trimmed);
      this.showAddColleagueInput.set(false);
      this.newColleagueName = '';
      this.shiftService.triggerHaptic();
    }
  }

  applyRecommendation(): void {
    const role = this.recommendation().recommendedRole;
    if (role && this.selectedColleague()) {
      this.shiftService.triggerHaptic();
      this.recommendationApplied.emit({
        colleague: this.selectedColleague(),
        role,
      });
    }
  }
}
