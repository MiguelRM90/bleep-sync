import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { DutyRole, ColleagueMetrics } from '../../models/shift.model';

@Component({
  selector: 'app-colleague-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './colleague-modal.component.html',
})
export class ColleagueModalComponent {
  readonly shiftService = inject(ShiftService);

  readonly close = output<void>();
  readonly colleagueSelected = output<string>();

  newColleagueName = '';
  selectedRole = signal<DutyRole>('Planta');
  shiftDate = signal<string>(new Date().toISOString().split('T')[0]);
  notes = '';
  isSaving = signal<boolean>(false);

  readonly availableRoles: { role: DutyRole; label: string; icon: string; desc: string }[] = [
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
    this.shiftService.triggerHaptic();
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

      // Notify parent to auto-select this colleague
      this.colleagueSelected.emit(trimmed);

      // Reset form fields
      this.newColleagueName = '';
      this.notes = '';
    } finally {
      this.isSaving.set(false);
    }
  }

  selectColleagueAndClose(colleagueName: string): void {
    this.colleagueSelected.emit(colleagueName);
    this.shiftService.triggerHaptic();
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

  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
