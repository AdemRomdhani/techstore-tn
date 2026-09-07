import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner-wrapper">
      <div class="spinner-border" [class.text-primary]="!error" [class.text-danger]="error" role="status">
        <span class="visually-hidden">{{ message }}</span>
      </div>
      @if (message) {
        <span class="ms-3 text-muted">{{ message }}</span>
      }
    </div>
  `,
})
export class LoadingSpinnerComponent {
  @Input() message = 'Loading...';
  @Input() error = false;
}
