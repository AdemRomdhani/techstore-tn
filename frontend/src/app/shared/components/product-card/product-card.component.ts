import { Component, Input, inject, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { ImageUrlPipe, resolveImageUrl } from '../../pipes/image-url.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, ImageUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card h-100 position-relative product-card" #cardEl
      (mousemove)="onMouseMove($event)" (mouseleave)="onMouseLeave()">
      @if (product.discount_percent && product.discount_percent > 0) {
        <span class="badge" style="position: absolute; top: 10px; left: 10px; z-index: 2; background: #ef4444; color: #fff; font-size: 0.75rem;">-{{ product.discount_percent }}%</span>
      }
      @if (product.featured) {
        <span class="badge" style="position: absolute; top: 10px; right: 10px; z-index: 2; background: #0ea5e9; color: #fff; font-size: 0.75rem;">
          <i class="bi bi-star-fill"></i> Featured
        </span>
      }
      <a [routerLink]="['/products', product.slug]" class="product-img-wrapper">
        <img [src]="(product.image || defaultPlaceholder) | imageUrl" [alt]="product.name" class="card-img-top product-img" style="height: 200px; object-fit: cover;" loading="lazy" (error)="onImgError($event)">
        <div class="product-img-overlay">
          <span class="overlay-icon"><i class="bi bi-eye"></i></span>
        </div>
      </a>
      <div class="card-body d-flex flex-column">
        @if (product.category_name) {
          <small style="color: #94a3b8; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em;">{{ product.category_name }}</small>
        }
        <h6 class="card-title mt-1 mb-2">
          <a [routerLink]="['/products', product.slug]" class="text-decoration-none" style="color: #e2e8f0;">
            {{ product.name }}
          </a>
        </h6>
        <div class="d-flex align-items-center gap-1 mb-2 small">
          @for (i of [1,2,3,4,5]; track i) {
            <i class="bi" [ngClass]="i <= (product.rating || 0) ? 'bi-star-fill' : 'bi-star'" [style.color]="i <= (product.rating || 0) ? '#fbbf24' : '#475569'"></i>
          }
          <span style="color: #64748b; margin-left: 4px;">({{ product.reviews_count || 0 }})</span>
        </div>
        <div class="mb-2 mt-auto">
          <span style="color: #0ea5e9; font-weight: 700; font-size: 1.1rem;">{{ product.price | number:'1.2-2' }} DT</span>
          @if (product.old_price) {
            <span style="color: #64748b; text-decoration: line-through; margin-left: 6px; font-size: 0.85rem;">{{ product.old_price | number:'1.2-2' }} DT</span>
          }
        </div>
        <button class="btn btn-sm w-100 add-to-cart-btn" style="background: #0ea5e9; color: #fff; border: none;" (click)="onAddToCart($event)" [disabled]="product.stock === 0">
          <i class="bi bi-cart-plus"></i>
          {{ product.stock === 0 ? 'Out of Stock' : 'Add to Cart' }}
        </button>
      </div>
    </div>
  `,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @ViewChild('cardEl') cardEl!: ElementRef<HTMLElement>;

  defaultPlaceholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="%23475569" viewBox="0 0 16 16" style="background:%231e293b;"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>';

  private cart = inject(CartService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultPlaceholder;
  }

  onMouseMove(event: MouseEvent): void {
    const card = this.cardEl?.nativeElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  }

  onMouseLeave(): void {
    const card = this.cardEl?.nativeElement;
    if (!card) return;
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }

  onAddToCart(event: MouseEvent): void {
    this.cart.add(this.product, 1);
    this.cdr.markForCheck();

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    this.flyToCart(event);
  }

  flyToCart(event: MouseEvent): void {
    const card = this.cardEl?.nativeElement;
    if (!card) return;

    const img = card.querySelector('.product-img') as HTMLElement;
    if (!img) return;

    const imgRect = img.getBoundingClientRect();
    const cartIcon = document.querySelector('.navbar .bi-cart3') as HTMLElement;
    if (!cartIcon) return;
    const cartRect = cartIcon.getBoundingClientRect();

    const clone = document.createElement('img');
    clone.src = resolveImageUrl(this.product.image) || this.defaultPlaceholder;
    clone.className = 'fly-to-cart-clone';
    clone.style.left = imgRect.left + imgRect.width / 2 - 20 + 'px';
    clone.style.top = imgRect.top + imgRect.height / 2 - 20 + 'px';
    clone.style.setProperty('--fly-x', (cartRect.left + cartRect.width / 2 - imgRect.left - imgRect.width / 2) + 'px');
    clone.style.setProperty('--fly-y', (cartRect.top + cartRect.height / 2 - imgRect.top - imgRect.height / 2) + 'px');
    document.body.appendChild(clone);

    setTimeout(() => {
      clone.remove();
      const badge = document.querySelector('.navbar .badge.rounded-pill') as HTMLElement;
      if (badge) {
        badge.classList.add('cart-bounce');
        setTimeout(() => badge.classList.remove('cart-bounce'), 400);
      }
    }, 700);
  }
}
