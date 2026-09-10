import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly maxWidthClass = input<string>('max-w-xl');
  readonly closeOnBackdropClick = input<boolean>(true);

  readonly close = output<void>();

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdropClick() && event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
