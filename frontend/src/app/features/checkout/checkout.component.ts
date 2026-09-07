import { Component, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container py-3 py-md-4 px-2 px-sm-3 fade-in">
      <h2 class="section-title" style="color: #e2e8f0;">Checkout</h2>

      @if (cart.items().length === 0) {
        <div class="empty-state card p-4 p-md-5">
          <i class="bi bi-cart-x" style="color: #475569;"></i>
          <h4 style="color: #e2e8f0;">Your cart is empty</h4>
          <a routerLink="/products" class="btn mx-auto" style="width: fit-content; background: #0ea5e9; color: #fff; border: none;">Browse Products</a>
        </div>
      } @else {
        <form (submit)="placeOrder($event)">
          <div class="row g-3 g-md-4">
            <div class="col-lg-7">
              <div class="card p-3 p-md-4">
                <h5 class="fw-bold mb-3" style="color: #e2e8f0; font-size: 1rem;"><i class="bi bi-person"></i> Your Information</h5>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Last Name *</label>
                    <input type="text" class="form-control" [(ngModel)]="form.nom" name="nom" required placeholder="Your last name" style="background: #0f172a; border-color: #334155; color: #e2e8f0;">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">First Name *</label>
                    <input type="text" class="form-control" [(ngModel)]="form.prenom" name="prenom" required placeholder="Your first name" style="background: #0f172a; border-color: #334155; color: #e2e8f0;">
                  </div>
                  <div class="col-12">
                    <label class="form-label">Address *</label>
                    <input type="text" class="form-control" [(ngModel)]="form.adresse" name="adresse" required placeholder="Full address" style="background: #0f172a; border-color: #334155; color: #e2e8f0;">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Phone Number *</label>
                    <input type="tel" class="form-control" [(ngModel)]="form.numero" name="numero" required placeholder="+216 XX XXX XXX" style="background: #0f172a; border-color: #334155; color: #e2e8f0;">
                  </div>
                </div>
              </div>
            </div>

            <div class="col-lg-5">
              <div class="card p-3 checkout-sticky" style="top: 80px;">
                <h5 class="fw-bold mb-3" style="color: #e2e8f0;">Order Summary</h5>
                @for (item of cart.items(); track item.product_id) {
                  <div class="d-flex gap-2 mb-2">
                    <img [src]="item.image || 'https://placehold.co/50'" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                    <div class="flex-grow-1 small">
                      <div class="fw-semibold" style="color: #e2e8f0;">{{ item.name }}</div>
                      <div style="color: #64748b;">Qty: {{ item.quantity }} x {{ item.price | number:'1.2-2' }} DT</div>
                    </div>
                    <div class="text-end small fw-bold" style="color: #e2e8f0;">{{ (item.price * item.quantity) | number:'1.2-2' }} DT</div>
                  </div>
                }
                <hr style="border-color: #334155;">
                <div class="d-flex justify-content-between mb-1"><span style="color: #94a3b8;">Subtotal</span><span style="color: #e2e8f0;">{{ subtotal() | number:'1.2-2' }} DT</span></div>
                <div class="d-flex justify-content-between mb-1"><span style="color: #94a3b8;">Shipping</span><span style="color: #e2e8f0;">{{ shippingCost() === 0 ? 'Free' : (shippingCost() | number:'1.2-2') + ' DT' }}</span></div>
                @if (taxAmount() > 0) {
                  <div class="d-flex justify-content-between mb-1"><span style="color: #94a3b8;">Tax</span><span style="color: #e2e8f0;">{{ taxAmount() | number:'1.2-2' }} DT</span></div>
                }
                <hr style="border-color: #334155;">
                <div class="d-flex justify-content-between fs-5">
                  <strong style="color: #e2e8f0;">Total</strong>
                  <strong style="color: #0ea5e9;">{{ total() | number:'1.2-2' }} DT</strong>
                </div>

                <div class="mt-3 mb-2">
                  <label class="form-label small fw-semibold" style="color: #e2e8f0;">Payment Method</label>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" id="pm1" value="cod" [(ngModel)]="payment_method" name="payment" checked>
                    <label class="form-check-label" for="pm1" style="color: #e2e8f0;"><i class="bi bi-cash"></i> Cash on Delivery</label>
                  </div>
                </div>

                <button type="submit" class="btn btn-lg w-100 mt-2" style="background: #0ea5e9; color: #fff; border: none;" [disabled]="submitting()">
                  @if (submitting()) {
                    <span class="spinner-border spinner-border-sm me-2"></span> Processing...
                  } @else {
                    <i class="bi bi-check-circle"></i> Place Order
                  }
                </button>
              </div>
            </div>
          </div>
        </form>
      }
    </div>
  `,
})
export class CheckoutComponent implements OnInit {
  cart = inject(CartService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  submitting = signal(false);
  payment_method = 'cod';
  shippingCost = signal(0);
  taxAmount = signal(0);

  form = {
    nom: '',
    prenom: '',
    adresse: '',
    numero: '',
  };

  ngOnInit(): void {
    this.loadShippingAndTax();
    this.cdr.markForCheck();
  }

  loadShippingAndTax(): void {
    const sub = this.cart.cartTotal();
    this.api.calculateShipping(sub).subscribe({
      next: (res: any) => {
        this.shippingCost.set(res.shipping || 0);
        this.cdr.markForCheck();
      },
      error: () => {
        this.api.getSettings().subscribe({
          next: (settingsRes: any) => {
            const settings = settingsRes.settings || {};
            const standardShipping = parseFloat(settings.standard_shipping) || 5.99;
            const freeThreshold = parseFloat(settings.free_shipping_threshold) || 50;
            this.shippingCost.set(sub >= freeThreshold ? 0 : standardShipping);
            this.cdr.markForCheck();
          },
          error: () => {
            this.shippingCost.set(0);
            this.cdr.markForCheck();
          },
        });
      },
    });
    this.api.calculateTax(sub).subscribe({
      next: (res: any) => {
        this.taxAmount.set(res.tax || 0);
        this.cdr.markForCheck();
      },
      error: () => {
        this.taxAmount.set(0);
        this.cdr.markForCheck();
      },
    });
  }

  subtotal(): number {
    return this.cart.cartTotal();
  }

  total(): number {
    const sub = this.subtotal();
    return +(sub + this.shippingCost() + this.taxAmount()).toFixed(2);
  }

  placeOrder(event: Event): void {
    event.preventDefault();
    if (!this.form.nom || !this.form.prenom || !this.form.adresse || !this.form.numero) {
      this.toast.error('Please fill in all fields');
      return;
    }

    this.submitting.set(true);
    this.cdr.markForCheck();

    const items = this.cart.getItems().map(i => ({ product_id: i.product_id, quantity: i.quantity }));

    this.api.createGuestOrder({
      items,
      nom: this.form.nom,
      prenom: this.form.prenom,
      adresse: this.form.adresse,
      numero: this.form.numero,
      payment_method: this.payment_method,
    }).subscribe({
      next: (res: any) => {
        this.cart.clear();
        localStorage.setItem('last_order_phone', this.form.numero);
        this.toast.success('Order placed successfully!');
        this.router.navigate(['/order', res.order.id]);
        this.submitting.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to place order');
        this.submitting.set(false);
        this.cdr.markForCheck();
      },
    });
  }
}
