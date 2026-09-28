import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaModalComponent } from 'pwa-ui-core/components';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, PwaModalComponent],
  template: `
    <pwa-modal
      [isOpen]="true"
      [title]="title()"
      [subtitle]="subtitle()"
      [closeOnBackdrop]="closeOnBackdropClick()"
      [maxWidth]="'36rem'"
      (close)="close.emit()"
    >
      <ng-content select="[modal-icon]" modal-icon></ng-content>
      <ng-content></ng-content>
      <ng-content select="[modal-footer]" modal-footer></ng-content>
    </pwa-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly maxWidthClass = input<string>('max-w-xl');
  readonly closeOnBackdropClick = input<boolean>(true);

  readonly close = output<void>();
}
