import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner-wrapper">
      <div class="spinner-border" [class.text-primary]="!error" [class.text-danger]="error" role="status">
        <span class="visually-hidden">{{ message }}</span>
      </div>
      <span class="ms-3 text-muted" *ngIf="message">{{ message }}</span>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  @Input() message = 'Loading...';
  @Input() error = false;
}
