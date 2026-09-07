import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container py-3 py-md-5 px-2 px-sm-3 fade-in">
      <div class="row align-items-center mb-4 mb-md-5">
        <div class="col-lg-6 mb-4 mb-lg-0">
          <span class="badge mb-3" style="background: rgba(14,165,233,0.15); color: #0ea5e9;">About Us</span>
          <h1 class="fw-bold mb-3" style="color: #e2e8f0; font-size: clamp(1.5rem, 4vw, 2.5rem);">We are Tech Store</h1>
          <p style="color: #94a3b8;">Technology at your fingertips. We make online shopping simple and accessible to everyone.</p>
          <p style="color: #94a3b8;">Founded in 2026, Tech Store brings together thousands of products from top brands. Quality, fair prices and exceptional customer service.</p>
          <a routerLink="/products" class="btn mt-2" style="background: #0ea5e9; color: #fff; border: none;">Explore Products</a>
        </div>
        <div class="col-lg-6">
          <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600" alt="About" class="img-fluid rounded-4" style="border: 1px solid #334155;">
        </div>
      </div>

      <div class="row g-3 g-md-4 text-center py-3 py-md-4">
        <div class="col-6 col-md-3">
          <h2 class="fw-bold" style="color: #0ea5e9; font-size: clamp(1.5rem, 4vw, 2.5rem);">10K+</h2>
          <p class="mb-0" style="color: #94a3b8;">Products</p>
        </div>
        <div class="col-6 col-md-3">
          <h2 class="fw-bold" style="color: #0ea5e9; font-size: clamp(1.5rem, 4vw, 2.5rem);">50K+</h2>
          <p class="mb-0" style="color: #94a3b8;">Customers</p>
        </div>
        <div class="col-6 col-md-3">
          <h2 class="fw-bold" style="color: #0ea5e9; font-size: clamp(1.5rem, 4vw, 2.5rem);">100+</h2>
          <p class="mb-0" style="color: #94a3b8;">Brands</p>
        </div>
        <div class="col-6 col-md-3">
          <h2 class="fw-bold" style="color: #0ea5e9; font-size: clamp(1.5rem, 4vw, 2.5rem);">4.9&#9733;</h2>
          <p class="mb-0" style="color: #94a3b8;">Rating</p>
        </div>
      </div>
    </div>
  `,
})
export class AboutComponent {}
