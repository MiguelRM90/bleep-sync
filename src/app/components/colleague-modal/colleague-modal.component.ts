import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { HapticService } from '../../services/haptic.service';
import { DutySessionStoreService } from '../../services/duty-session-store.service';
import { DutyRole } from '../../models/shift.model';
import { ModalComponent } from '../ui/modal/modal.component';
import { DateFormatPipe } from '../../pipes/date-format.pipe';

interface RoleOption {
  role: DutyRole;
  label: string;
  icon: string;
  desc: string;
}

@Component({
  selector: 'app-colleague-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, DateFormatPipe],
  templateUrl: './colleague-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColleagueModalComponent {
  readonly shiftService = inject(ShiftService);
  private readonly hapticService = inject(HapticService);
  private readonly sessionStore = inject(DutySessionStoreService);

  readonly close = output<void>();
  readonly colleagueSelected = output<string>();

  newColleagueName = '';
  readonly selectedRole = signal<DutyRole>('Planta');
  readonly shiftDate = signal<string>(new Date().toISOString().split('T')[0]);
  notes = '';
  readonly isSaving = signal<boolean>(false);

  readonly availableRoles: readonly RoleOption[] = [
    {
      role: 'Planta',
      label: 'Planta',
      icon: '🏥',
      desc: 'Llevaste el busca de hospitalización / camas',
    },
    {
      role: 'Urgencias',
      label: 'Urgencias',
      icon: '🚨',
      desc: 'Llevaste el busca de avisos urgentes',
    },
    {
      role: 'Ambos',
      label: 'Ambos',
      icon: '🔄',
      desc: 'Guardia conjunta o turnos compartidos',
    },
  ];

  setRole(role: DutyRole): void {
    this.selectedRole.set(role);
    this.hapticService.trigger();
  }

  async saveColleague(): Promise<void> {
    const trimmed = this.newColleagueName.trim();
    if (!trimmed) return;

    this.isSaving.set(true);
    try {
      await this.shiftService.registerColleagueBaseline(
        trimmed,
        this.selectedRole(),
        this.shiftDate(),
        this.notes.trim() || 'Historial previo inicial'
      );

      // Update active session and notify
      this.sessionStore.setActiveColleague(trimmed);
      this.colleagueSelected.emit(trimmed);

      // Reset form fields
      this.newColleagueName = '';
      this.notes = '';
    } finally {
      this.isSaving.set(false);
    }
  }

  selectColleagueAndClose(colleagueName: string): void {
    this.sessionStore.setActiveColleague(colleagueName);
    this.colleagueSelected.emit(colleagueName);
    this.hapticService.trigger();
    this.close.emit();
  }

  confirmDeleteColleague(colleagueName: string): void {
    if (confirm(`¿Eliminar a "${colleagueName}" y todo su historial de guardias?`)) {
      this.shiftService.removeColleagueHistory(colleagueName);
    }
  }

  getNextRecommendedRole(lastRole?: DutyRole): string {
    if (lastRole === 'Planta') return 'Urgencias';
    if (lastRole === 'Urgencias') return 'Planta';
    return 'Manual';
  }
}
