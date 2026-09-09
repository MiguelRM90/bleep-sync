import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';

@Component({
  selector: 'app-metrics-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metrics-summary.component.html',
})
export class MetricsSummaryComponent {
  readonly shiftService = inject(ShiftService);
  readonly activeTab = signal<'timeline' | 'balance'>('timeline');

  deleteShift(id: string): void {
    if (confirm('¿Seguro que deseas eliminar este registro de guardia?')) {
      this.shiftService.deleteShift(id);
    }
  }
}
