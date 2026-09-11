import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftService } from '../../services/shift.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly shiftService = inject(ShiftService);
  readonly openConfig = output<void>();
  readonly openTutorial = output<void>();

  async onGoogleDriveClick(): Promise<void> {
    if (this.shiftService.googleAuthService.isConnected()) {
      this.openConfig.emit();
    } else {
      await this.shiftService.connectGoogle();
    }
  }
}
