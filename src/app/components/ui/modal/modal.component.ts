import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaModalComponent } from 'pwa-ui-core/components';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, PwaModalComponent],
  templateUrl: './modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly maxWidthClass = input<string>('max-w-xl');
  readonly closeOnBackdropClick = input<boolean>(true);

  readonly close = output<void>();
}
