import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container py-3 py-md-4 px-2 px-sm-3 fade-in">
      @if (loading) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (!order) {
        <div class="empty-state">
          <h4 style="color: #e2e8f0;">Order not found</h4>
          <a routerLink="/products" class="btn" style="background: #0ea5e9; color: #fff; border: none;">Back to Products</a>
        </div>
      } @else {
        <nav class="mb-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a routerLink="/" style="color: #0ea5e9;">Home</a></li>
            <li class="breadcrumb-item active" style="color: #94a3b8;">Order #{{ order.id }}</li>
          </ol>
        </nav>

        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="mb-0 fw-bold" style="color: #e2e8f0;">Order #{{ order.id }}</h2>
          <span class="badge status-{{ order.status }} px-3 py-2 fs-6">{{ order.status }}</span>
        </div>

        <div class="row g-3">
          <div class="col-lg-8">
            <div class="card p-3 mb-3">
              <h6 class="fw-bold" style="color: #e2e8f0;">Items</h6>
              @for (item of order.items; track item.id) {
                <div class="d-flex gap-2 gap-md-3 py-2" style="border-bottom: 1px solid #334155;">
                  <img [src]="item.product_image || 'https://placehold.co/80'" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; flex-shrink: 0;">
                  <div class="flex-grow-1">
                    <div class="fw-semibold" style="color: #e2e8f0;">{{ item.product_name }}</div>
                    <small style="color: #64748b;">Qty: {{ item.quantity }} x {{ item.price | number:'1.2-2' }} DT</small>
                  </div>
                  <strong style="color: #e2e8f0;">{{ (item.price * item.quantity) | number:'1.2-2' }} DT</strong>
                </div>
              }
            </div>

            <div class="card p-3">
              <h6 class="fw-bold mb-2" style="color: #e2e8f0;">Shipping Address</h6>
              <p class="mb-0" style="color: #94a3b8;">
                {{ order.shipping_name }}<br>
                {{ order.shipping_address }}<br>
                <i class="bi bi-telephone"></i> {{ order.shipping_phone }}
              </p>
            </div>
          </div>

          <div class="col-lg-4">
            <div class="card p-3">
              <h6 class="fw-bold" style="color: #e2e8f0;">Summary</h6>
              <div class="d-flex justify-content-between mb-1"><span style="color: #94a3b8;">Payment</span><span class="text-uppercase" style="color: #e2e8f0;">{{ order.payment_method }}</span></div>
              <div class="d-flex justify-content-between mb-1"><span style="color: #94a3b8;">Date</span><span style="color: #e2e8f0;">{{ order.created_at | date: 'medium' }}</span></div>
              <hr style="border-color: #334155;">
              <div class="d-flex justify-content-between fs-5">
                <strong style="color: #e2e8f0;">Total</strong>
                <strong style="color: #0ea5e9;">{{ order.total | number:'1.2-2' }} DT</strong>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class OrderDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  order: any = null;
  loading = true;

  async ngOnInit(): Promise<void> {
    this.route.params.subscribe(async (params) => {
      const phone = localStorage.getItem('last_order_phone');
      if (!phone) {
        this.order = null;
        this.loading = false;
        this.cdr.markForCheck();
        return;
      }
      try {
        const res: any = await this.api.getOrderGuest(+params['id'], phone).toPromise();
        this.order = res.order;
      } catch {
        this.order = null;
      }
      this.loading = false;
      this.cdr.markForCheck();
    });
  }
}
