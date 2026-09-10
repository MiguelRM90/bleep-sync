import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  output,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { HapticService } from '../../services/haptic.service';
import { DutySessionStoreService } from '../../services/duty-session-store.service';
import { DutyRole } from '../../models/shift.model';

@Component({
  selector: 'app-duty-checker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duty-checker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DutyCheckerComponent {
  readonly shiftService = inject(ShiftService);
  private readonly hapticService = inject(HapticService);
  readonly sessionStore = inject(DutySessionStoreService);

  readonly colleagueChange = output<string>();
  readonly recommendationApplied = output<{ colleague: string; role: DutyRole }>();
  readonly openColleagueManager = output<void>();

  readonly showAddColleagueInput = signal<boolean>(false);
  newColleagueName = '';

  readonly selectedColleague = this.sessionStore.activeColleague;

  readonly recommendation = computed(() => {
    return this.shiftService.getRecommendationForColleague(this.selectedColleague());
  });

  constructor() {
    // Default to the first colleague in the roster if available and none selected yet
    effect(() => {
      const list = this.shiftService.colleagues();
      if (list.length > 0 && !this.selectedColleague()) {
        this.sessionStore.setActiveColleague(list[0]);
        this.colleagueChange.emit(list[0]);
      }
    });
  }

  onColleagueSelect(colleague: string): void {
    this.sessionStore.setActiveColleague(colleague);
    this.colleagueChange.emit(colleague);
    this.hapticService.trigger();
  }

  toggleAddColleague(): void {
    this.showAddColleagueInput.update((v) => !v);
    this.newColleagueName = '';
  }

  addNewColleague(): void {
    const trimmed = this.newColleagueName.trim();
    if (trimmed) {
      this.sessionStore.setActiveColleague(trimmed);
      this.colleagueChange.emit(trimmed);
      this.showAddColleagueInput.set(false);
      this.newColleagueName = '';
      this.hapticService.trigger();
    }
  }

  applyRecommendation(): void {
    const role = this.recommendation().recommendedRole;
    const colleague = this.selectedColleague();
    if (role && colleague) {
      this.hapticService.trigger();
      this.sessionStore.applyRecommendation(colleague, role);
      this.recommendationApplied.emit({ colleague, role });
    }
  }
}
