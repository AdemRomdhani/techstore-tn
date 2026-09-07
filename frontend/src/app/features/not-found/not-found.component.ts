import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container py-5 text-center fade-in">
      <h1 class="display-1 fw-bold text-primary">404</h1>
      <h2 class="fw-bold">Page Not Found</h2>
      <p class="text-muted mb-4">The page you're looking for doesn't exist or has been moved.</p>
      <a routerLink="/" class="btn btn-primary">
        <i class="bi bi-house"></i> Back to Home
      </a>
    </div>
  `,
})
export class NotFoundComponent {}
