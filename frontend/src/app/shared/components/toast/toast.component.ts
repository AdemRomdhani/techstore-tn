import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast-notification" [class.error]="t.type === 'error'" [class.warning]="t.type === 'warning'">
          <div class="d-flex align-items-center gap-2">
            <i class="bi" [ngClass]="iconFor(t.type)"></i>
            <span class="flex-grow-1">{{ t.message }}</span>
            <button class="btn-close btn-close-sm" (click)="toast.dismiss(t.id)"></button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  toast = inject(ToastService);

  iconFor(type: string): string {
    const map: Record<string, string> = {
      success: 'bi-check-circle-fill text-success',
      error: 'bi-x-circle-fill text-danger',
      warning: 'bi-exclamation-triangle-fill text-warning',
      info: 'bi-info-circle-fill text-primary',
    };
    return map[type] || map['info'];
  }
}
