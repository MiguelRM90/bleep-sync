import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly shiftService = inject(ShiftService);
  readonly openConfig = output<void>();
}
