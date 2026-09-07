import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container py-3 py-md-4 px-2 px-sm-3 fade-in">
      <h2 class="section-title" style="color: #e2e8f0;">Cart</h2>

      @if (cart.items().length === 0) {
        <div class="empty-state card p-4 p-md-5">
          <i class="bi bi-cart-x" style="color: #475569;"></i>
          <h4 style="color: #e2e8f0;">Your cart is empty</h4>
          <p style="color: #64748b;">Add products to get started</p>
          <a routerLink="/products" class="btn mx-auto" style="width: fit-content; background: #0ea5e9; color: #fff; border: none;">Browse Products</a>
        </div>
      } @else {
        <div class="row g-3">
          <div class="col-lg-8">
            <div class="card p-2 p-md-3">
              @for (item of cart.items(); track item.product_id) {
                <div class="d-flex gap-2 gap-md-3 py-3 cart-item-flex" style="border-bottom: 1px solid #334155;">
                  <a [routerLink]="['/products', item.slug]">
                    <img [src]="item.image || 'https://placehold.co/100'" [alt]="item.name" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
                  </a>
                  <div class="flex-grow-1" style="min-width: 0;">
                    <a [routerLink]="['/products', item.slug]" class="text-decoration-none">
                      <h6 class="mb-1 fw-bold" style="color: #e2e8f0; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.name }}</h6>
                    </a>
                    @if (item.brand) {
                      <small style="color: #64748b; font-size: 0.75rem;">{{ item.brand }}</small>
                    }
                    <div class="mt-1">
                      <span class="fw-bold" style="color: #0ea5e9; font-size: 0.9rem;">{{ item.price | number:'1.2-2' }} DT</span>
                    </div>
                  </div>
                  <div class="d-flex flex-column align-items-end gap-1 gap-md-2 cart-item-actions" style="flex-shrink: 0;">
                    <div class="input-group input-group-sm" style="width: 110px;">
                      <button class="btn" style="background: #334155; color: #e2e8f0; border: none; min-width: 32px;" (click)="updateQty(item.product_id, item.quantity - 1)" [disabled]="item.quantity <= 1">-</button>
                      <input type="number" class="form-control text-center" [value]="item.quantity" (change)="onQtyChange($event, item)" min="1" [max]="item.stock" style="background: #1e293b; border-color: #334155; color: #e2e8f0; min-width: 0;">
                      <button class="btn" style="background: #334155; color: #e2e8f0; border: none; min-width: 32px;" (click)="updateQty(item.product_id, item.quantity + 1)" [disabled]="item.quantity >= item.stock">+</button>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      <button class="btn btn-sm p-1" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: none; font-size: 0.75rem;" (click)="removeItem(item.product_id)">
                        <i class="bi bi-trash"></i>
                      </button>
                      <strong style="color: #0ea5e9; font-size: 0.85rem;">{{ (item.price * item.quantity) | number:'1.2-2' }} DT</strong>
                    </div>
                  </div>
                </div>
              }
              <div class="d-flex justify-content-between mt-3 gap-2">
                <a routerLink="/products" class="btn btn-sm" style="background: #334155; color: #e2e8f0; border: none;">
                  <i class="bi bi-arrow-left"></i> <span class="d-none d-sm-inline">Continue Shopping</span><span class="d-sm-none">Back</span>
                </a>
                <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: none;" (click)="clearCart()">
                  <i class="bi bi-trash"></i> Clear
                </button>
              </div>
            </div>
          </div>

          <div class="col-lg-4">
            <div class="card p-3 sticky-top" style="top: 80px;">
              <h5 class="fw-bold mb-3" style="color: #e2e8f0; font-size: 1rem;">Summary</h5>
              <div class="d-flex justify-content-between mb-2">
                <span style="color: #94a3b8; font-size: 0.9rem;">Subtotal ({{ cart.itemCount() }} items)</span>
                <strong style="color: #e2e8f0;">{{ cart.cartTotal() | number:'1.2-2' }} DT</strong>
              </div>
              <div class="d-flex justify-content-between mb-2">
                <span style="color: #94a3b8; font-size: 0.9rem;">Shipping</span>
                <strong style="color: #e2e8f0;">{{ shippingCost() === 0 ? 'Free' : (shippingCost() | number:'1.2-2') + ' DT' }}</strong>
              </div>
              <hr style="border-color: #334155;">
              <div class="d-flex justify-content-between fs-5">
                <strong style="color: #e2e8f0;">Total</strong>
                <strong style="color: #0ea5e9;">{{ getTotal() | number:'1.2-2' }} DT</strong>
              </div>
              <button class="btn btn-lg w-100 mt-3" style="background: #0ea5e9; color: #fff; border: none;" (click)="checkout()">
                Checkout <i class="bi bi-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CartComponent implements OnInit {
  cart = inject(CartService);
  private api = inject(ApiService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

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

  updateQty(productId: number, qty: number): void {
    if (qty < 1) return;
    this.cart.updateQuantity(productId, qty);
    this.loadShipping();
    this.cdr.markForCheck();
  }

  onQtyChange(event: any, item: any): void {
    const qty = parseInt(event.target.value) || 1;
    this.updateQty(item.product_id, qty);
  }

  removeItem(productId: number): void {
    this.cart.remove(productId);
    this.loadShipping();
    this.cdr.markForCheck();
  }

  clearCart(): void {
    if (!confirm('Clear cart?')) return;
    this.cart.clear();
    this.shippingCost.set(0);
    this.cdr.markForCheck();
  }

  getTotal(): number {
    return this.cart.getTotal() + this.shippingCost();
  }

  checkout(): void {
    this.router.navigate(['/checkout']);
  }
}
