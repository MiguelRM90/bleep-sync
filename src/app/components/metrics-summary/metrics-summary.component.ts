import { Component, ChangeDetectionStrategy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';
import { DateFormatPipe } from '../../pipes/date-format.pipe';

@Component({
  selector: 'app-metrics-summary',
  standalone: true,
  imports: [CommonModule, DateFormatPipe],
  templateUrl: './metrics-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsSummaryComponent {
  readonly shiftService = inject(ShiftService);
  readonly activeTab = signal<'timeline' | 'balance'>('timeline');
  readonly openColleagueManager = output<void>();

  deleteShift(id: string): void {
    if (confirm('¿Seguro que deseas eliminar este registro de guardia?')) {
      this.shiftService.deleteShift(id);
    }
  }
}
