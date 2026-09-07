import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-wrapper">
      <div class="login-card shadow">
        <div class="text-center mb-4">
          <img src="assets/781550622_1700303331226624_6712455829304365264_n-removebg-preview.png" alt="Tech Store" style="width: 60px; height: 60px; object-fit: contain; display: block; margin: 0 auto;" />
          <h4 class="mt-3 fw-bold" style="color: #e2e8f0;">Tech Store</h4>
          <p class="text-muted small">Admin Panel</p>
        </div>

        <form (submit)="login($event)">
          <div class="mb-3">
            <label class="form-label small fw-semibold" style="color: #94a3b8;">Email</label>
            <input type="email" class="form-control" [(ngModel)]="email" name="email" required
              placeholder="admin@shop.com" autocomplete="email"
              style="background: #0f172a; border-color: #334155; color: #e2e8f0;">
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold" style="color: #94a3b8;">Password</label>
            <div class="position-relative">
              <input [type]="showPassword() ? 'text' : 'password'" class="form-control pe-5" [(ngModel)]="password" name="password" required
                placeholder="Enter password" autocomplete="current-password"
                style="background: #0f172a; border-color: #334155; color: #e2e8f0;">
              <button type="button" class="btn position-absolute top-50 end-0 translate-middle-y me-2 p-0"
                style="background: none; border: none; color: #64748b;" (click)="showPassword.set(!showPassword())">
                <i class="bi" [ngClass]="showPassword() ? 'bi-eye-slash' : 'bi-eye'"></i>
              </button>
            </div>
          </div>

          @if (error()) {
            <div class="alert alert-danger py-2 small" role="alert">{{ error() }}</div>
          }

          <button type="submit" class="btn w-100 fw-semibold" style="background: #0ea5e9; color: #fff; border: none;"
            [disabled]="loading()">
            @if (loading()) {
              <span class="spinner-border spinner-border-sm me-2"></span> Signing in...
            } @else {
              <i class="bi bi-box-arrow-in-right me-2"></i> Sign In
            }
          </button>
        </form>

        <div class="mt-4 pt-3 border-top text-center" style="border-color: #334155 !important;">
          <small style="color: #64748b;">
            <i class="bi bi-shield-lock me-1"></i> Secure admin access only
          </small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #020617;
      padding: 1rem;
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
    }
  `],
})
export class LoginComponent {
  private auth = inject(AdminAuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  login(event: Event): void {
    event.preventDefault();
    if (!this.email || !this.password) {
      this.error.set('Please fill in all fields');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.cdr.markForCheck();

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.toast.success('Welcome back!');
        this.router.navigate(['/dashboard']);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Login failed');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }
}
