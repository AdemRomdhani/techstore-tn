import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ApiService } from '../../core/services/api.service';
import { FormsModule } from '@angular/forms';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule, ImageUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Top announcement bar -->
    <div class="announcement-bar text-white py-2 small text-center d-none d-sm-block" style="background: linear-gradient(90deg, #020617, #0f172a); border-bottom: 1px solid var(--border);">
      <span class="me-3"><i class="bi bi-truck"></i> Free shipping over 50 DT</span>
      <span class="me-3"><i class="bi bi-shield-check"></i> Cash on Delivery</span>
      <span><i class="bi bi-headset"></i> 24/7 Support</span>
    </div>

    <!-- Header -->
    <nav class="navbar navbar-expand-lg sticky-top" style="background: #0f172a; border-bottom: 1px solid #1e293b;">
      <div class="container px-2 px-sm-3">
        <a class="navbar-brand fw-bold text-white d-flex align-items-center gap-2" routerLink="/" style="font-size: 1.15rem;">
          <img src="assets/781550622_1700303331226624_6712455829304365264_n-removebg-preview.png" alt="Tech Store Logo" style="height: 34px; width: 34px; object-fit: contain;">
          <span><span style="color: #0ea5e9;">Tech</span><span style="color: #06b6d4;"> Store</span></span>
        </a>
        <div class="d-flex align-items-center gap-2 d-lg-none">
          <button class="nav-link position-relative text-white p-1 bg-transparent border-0" (click)="cartPanelOpen = true; cdr.markForCheck()">
            <i class="bi bi-cart3 fs-5"></i>
            @if (cart.itemCount() > 0) {
              <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill" style="font-size: 0.6rem; background: #0ea5e9; color: #fff;">
                {{ cart.itemCount() }}
              </span>
            }
          </button>
          <button class="navbar-toggler border-0 p-1" type="button" (click)="mobileOpen = !mobileOpen" [attr.aria-expanded]="mobileOpen" style="border-color: transparent;">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
        <div class="collapse navbar-collapse" [class.show]="mobileOpen">
          <form class="d-flex mx-auto my-2 my-lg-0" style="max-width: 500px; width: 100%;" (submit)="onSearch($event)">
            <input class="form-control me-2" type="search" placeholder="Search..." [(ngModel)]="searchQuery" name="search" style="background: #1e293b; border-color: #334155; color: #e2e8f0;">
            <button class="btn" type="submit" style="background: #0ea5e9; color: #fff;"><i class="bi bi-search"></i></button>
          </form>
          <ul class="navbar-nav ms-auto align-items-lg-center gap-2">
            <li class="nav-item d-none d-lg-block">
              <a class="nav-link position-relative text-white" routerLink="/cart" routerLinkActive="active">
                <i class="bi bi-cart3 fs-5"></i>
                @if (cart.itemCount() > 0) {
                  <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill" style="font-size: 0.65rem; background: #0ea5e9; color: #fff;">
                    {{ cart.itemCount() }}
                  </span>
                }
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- Cart Slide Panel (mobile) -->
    @if (cartPanelOpen) {
      <div class="cart-backdrop" (click)="cartPanelOpen = false; cdr.markForCheck()"></div>
      <div class="cart-panel">
        <div class="cart-panel-header">
          <h6 class="mb-0 fw-bold text-white"><i class="bi bi-cart3 me-2"></i>Cart ({{ cart.itemCount() }})</h6>
          <button class="btn btn-sm p-1 bg-transparent border-0" (click)="cartPanelOpen = false; cdr.markForCheck()">
            <i class="bi bi-x-lg text-white fs-5"></i>
          </button>
        </div>

        <div class="cart-panel-body">
          @if (cart.items().length === 0) {
            <div class="empty-cart-panel">
              <i class="bi bi-cart-x d-block mb-2" style="color: #475569; font-size: 3rem;"></i>
              <p style="color: #94a3b8;">Your cart is empty</p>
              <button class="btn" style="background: #0ea5e9; color: #fff; border: none;" (click)="cartPanelOpen = false; cdr.markForCheck()">Browse Products</button>
            </div>
          } @else {
            @for (item of cart.items(); track item.product_id) {
              <div class="cart-panel-item">
                <a [routerLink]="['/products', item.slug]" (click)="cartPanelOpen = false; cdr.markForCheck()">
                  <img [src]="(item.image || 'https://placehold.co/80') | imageUrl" [alt]="item.name" class="cart-panel-thumb">
                </a>
                <div class="flex-grow-1 min-width-0">
                  <a [routerLink]="['/products', item.slug]" (click)="cartPanelOpen = false; cdr.markForCheck()" class="text-decoration-none">
                    <div class="text-truncate fw-semibold" style="color: #e2e8f0; font-size: 0.85rem;">{{ item.name }}</div>
                  </a>
                  <small style="color: #64748b;">{{ item.price | number:'1.2-2' }} DT x {{ item.quantity }}</small>
                  <div class="fw-bold mt-1" style="color: #0ea5e9; font-size: 0.85rem;">{{ (item.price * item.quantity) | number:'1.2-2' }} DT</div>
                </div>
                <div class="d-flex flex-column align-items-end gap-1">
                  <button class="btn btn-sm p-0 bg-transparent border-0" style="color: #64748b; font-size: 0.7rem;" (click)="removeItem(item.product_id)">
                    <i class="bi bi-x-lg"></i>
                  </button>
                  <div class="input-group input-group-sm" style="width: 80px;">
                    <button class="btn" style="background: #334155; color: #e2e8f0; border: none; min-width: 24px; font-size: 0.75rem; padding: 0.15rem;" (click)="updateQty(item.product_id, item.quantity - 1)" [disabled]="item.quantity <= 1">-</button>
                    <input type="text" class="form-control text-center p-0" [value]="item.quantity" readonly style="background: #1e293b; border-color: #334155; color: #e2e8f0; font-size: 0.8rem; min-width: 0;">
                    <button class="btn" style="background: #334155; color: #e2e8f0; border: none; min-width: 24px; font-size: 0.75rem; padding: 0.15rem;" (click)="updateQty(item.product_id, item.quantity + 1)" [disabled]="item.quantity >= item.stock">+</button>
                  </div>
                </div>
              </div>
            }
          }
        </div>

        @if (cart.items().length > 0) {
          <div class="cart-panel-footer">
            <div class="d-flex justify-content-between mb-2">
              <span style="color: #94a3b8;">Subtotal</span>
              <strong style="color: #e2e8f0;">{{ cart.cartTotal() | number:'1.2-2' }} DT</strong>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span style="color: #94a3b8;">Shipping</span>
              <strong style="color: #e2e8f0;">{{ shippingCost() === 0 ? 'Free' : (shippingCost() | number:'1.2-2') + ' DT' }}</strong>
            </div>
            <hr style="border-color: #334155; margin: 0.5rem 0;">
            <div class="d-flex justify-content-between mb-3">
              <strong style="color: #e2e8f0;">Total</strong>
              <strong style="color: #0ea5e9;">{{ getTotal() | number:'1.2-2' }} DT</strong>
            </div>
            <button class="btn w-100 mb-2" style="background: #0ea5e9; color: #fff; border: none;" (click)="goToCheckout()">
              Checkout <i class="bi bi-arrow-right"></i>
            </button>
            <button class="btn w-100" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: none; font-size: 0.85rem;" (click)="clearCart()">
              <i class="bi bi-trash me-1"></i> Clear Cart
            </button>
          </div>
        }
      </div>
    }

    <!-- Main content -->
    <main style="background: #0f172a; min-height: 60vh;">
      <router-outlet></router-outlet>
    </main>

    <!-- Footer -->
    <footer class="footer-dark text-white py-4 py-md-5" style="background: #020617; border-top: 1px solid #1e293b;">
      <div class="container px-2 px-sm-3">
        <div class="row g-3 g-md-4">
          <div class="col-12 col-lg-4 mb-3 mb-lg-0">
            <h5 class="fw-bold mb-2">
              <span style="color: #0ea5e9;">Tech</span><span style="color: #06b6d4;"> Store</span>
            </h5>
            <p class="small mb-0" style="color: #94a3b8;">Technology at your fingertips. Best products, fast delivery and amazing offers.</p>
          </div>
          <div class="col-6 col-lg-2">
            <h6 class="fw-bold mb-2 text-white">Shop</h6>
            <ul class="list-unstyled small">
              <li class="mb-1"><a routerLink="/products" style="color: #94a3b8;">All Products</a></li>
            </ul>
          </div>
          <div class="col-6 col-lg-2">
            <h6 class="fw-bold mb-2 text-white">Support</h6>
            <ul class="list-unstyled small">
              <li class="mb-1"><a routerLink="/about" style="color: #94a3b8;">About</a></li>
              <li class="mb-1"><a routerLink="/contact" style="color: #94a3b8;">Contact</a></li>
            </ul>
          </div>
          <div class="col-12 col-lg-3">
            <h6 class="fw-bold mb-2 text-white">Contact</h6>
            <ul class="list-unstyled small" style="color: #94a3b8;">
              <li class="mb-1"><i class="bi bi-geo-alt"></i> Tunis, Tunisia</li>
              <li class="mb-1"><i class="bi bi-envelope"></i> support&#64;techstore.com</li>
              <li class="mb-1"><i class="bi bi-telephone"></i> +216 71 123 456</li>
            </ul>
          </div>
        </div>
        <hr style="border-color: #1e293b; margin: 1rem 0;">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center">
          <small style="color: #64748b;">&copy; {{ year }} Tech Store. All rights reserved.</small>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .cart-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 1049;
      animation: fadeIn 0.2s ease;
    }
    .cart-panel {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 320px;
      max-width: 85vw;
      background: #0f172a;
      border-right: 1px solid #1e293b;
      z-index: 1050;
      display: flex;
      flex-direction: column;
      animation: slideInLeft 0.3s ease;
    }
    @keyframes slideInLeft {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .cart-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid #1e293b;
      background: #0f172a;
      flex-shrink: 0;
    }
    .cart-panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
      padding-bottom: 180px;
    }
    .cart-panel-item {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.6rem;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .cart-panel-item:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .cart-panel-thumb {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid #334155;
    }
    .cart-panel-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 1rem;
      border-top: 1px solid #1e293b;
      background: #0f172a;
      flex-shrink: 0;
      z-index: 1;
    }
    .empty-cart-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 2rem;
    }
    @media (min-width: 992px) {
      .cart-panel, .cart-backdrop {
        display: none !important;
      }
    }
  `],
})
export class MainLayoutComponent implements OnInit {
  cart = inject(CartService);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  cdr = inject(ChangeDetectorRef);

  mobileOpen = false;
  cartPanelOpen = false;
  searchQuery = this.route.snapshot.queryParams['search'] || '';
  year = new Date().getFullYear();
  shippingCost = signal(0);

  ngOnInit(): void {
    this.loadShipping();
  }

  loadShipping(): void {
    const sub = this.cart.cartTotal();
    this.api.calculateShipping(sub).subscribe({
      next: (res: any) => {
        this.shippingCost.set(res.shipping || 0);
        this.cdr.markForCheck();
      },
      error: () => {
        this.shippingCost.set(0);
        this.cdr.markForCheck();
      },
    });
  }

  onSearch(event: Event): void {
    event.preventDefault();
    const query = this.searchQuery.trim();
    this.router.navigate(['/products'], { queryParams: query ? { search: query } : {} });
    this.mobileOpen = false;
  }

  updateQty(productId: number, qty: number): void {
    if (qty < 1) return;
    this.cart.updateQuantity(productId, qty);
    this.loadShipping();
    this.cdr.markForCheck();
  }

  removeItem(productId: number): void {
    this.cart.remove(productId);
    this.loadShipping();
    this.cdr.markForCheck();
  }

  clearCart(): void {
    this.cart.clear();
    this.shippingCost.set(0);
    this.cdr.markForCheck();
  }

  getTotal(): number {
    return this.cart.getTotal() + this.shippingCost();
  }

  goToCheckout(): void {
    this.cartPanelOpen = false;
    this.router.navigate(['/checkout']);
  }
}
