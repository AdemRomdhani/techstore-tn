import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';
import { Order } from '../../core/models';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingSpinnerComponent, ImageUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-fluid py-3 py-md-4 px-2 px-sm-3">
      <div class="d-flex align-items-center mb-3 mb-md-4">
        <a routerLink="/orders" class="btn btn-sm me-2 me-md-3" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" style="border: none;">
          <i class="bi bi-arrow-left"></i>
        </a>
        <div>
          <h2 class="fw-bold mb-0" [style.color]="'var(--text-primary)'" style="font-size: clamp(1rem, 3vw, 1.5rem);">Order #{{ order()?.id || '' }}</h2>
          <p class="mb-0 d-none d-md-block small" [style.color]="'var(--text-muted)'">Order details and management</p>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Loading order details..." />
      } @else if (order()) {
        <div class="row g-4 order-detail-stack">
          <div class="col-lg-8">
            <div class="card mb-4" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
              <div class="card-header" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'">
                <h6 class="fw-semibold mb-0" [style.color]="'var(--text-primary)'">
                  <i class="bi bi-info-circle me-2" [style.color]="'var(--primary)'"></i>Order Information
                </h6>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-4">
                    <small class="d-block mb-1" [style.color]="'var(--text-muted)'">Order ID</small>
                    <span class="fw-bold fs-5" [style.color]="'var(--primary)'">#{{ order()!.id }}</span>
                  </div>
                  <div class="col-md-4">
                    <small class="d-block mb-1" [style.color]="'var(--text-muted)'">Date</small>
                    <span class="fw-medium" [style.color]="'var(--text-primary)'">{{ formatDate(order()!.created_at) }}</span>
                  </div>
                  <div class="col-md-4">
                    <small class="d-block mb-1" [style.color]="'var(--text-muted)'">Status</small>
                    <span class="badge" [ngClass]="statusBadgeClass(order()!.status)">
                      {{ order()!.status }}
                    </span>
                  </div>
                  <div class="col-md-4">
                    <small class="d-block mb-1" [style.color]="'var(--text-muted)'">Payment Method</small>
                    <span class="fw-medium text-capitalize" [style.color]="'var(--text-primary)'">{{ order()!.payment_method || 'N/A' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card mb-4" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
              <div class="card-header" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'">
                <h6 class="fw-semibold mb-0" [style.color]="'var(--text-primary)'">
                  <i class="bi bi-box-seam me-2" [style.color]="'var(--primary)'"></i>Order Items
                </h6>
              </div>
              <div class="table-responsive">
                <table class="table align-middle mb-0">
                  <thead [style.background]="'var(--bg-surface-alt)'">
                    <tr>
                      <th class="ps-3 fw-semibold">Product</th>
                      <th class="fw-semibold">Price</th>
                      <th class="fw-semibold">Quantity</th>
                      <th class="text-end pe-3 fw-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of order()!.items || []; track item.id) {
                      <tr>
                        <td class="ps-3">
                          <div class="d-flex align-items-center gap-3">
                            @if (item.product_image) {
                              <img
                                [src]="item.product_image | imageUrl"
                                [alt]="item.product_name"
                                class="rounded"
                                style="width: 48px; height: 48px; object-fit: cover;"
                              />
                            } @else {
                              <div
                                class="rounded d-flex align-items-center justify-content-center"
                                style="width: 48px; height: 48px;"
                                [style.background]="'var(--border-color)'"
                              >
                                <i class="bi bi-image" [style.color]="'var(--text-muted)'"></i>
                              </div>
                            }
                            <div>
                              <div class="fw-medium">{{ item.product_name }}</div>
                            </div>
                          </div>
                        </td>
                        <td>{{ formatCurrency(item.price) }}</td>
                        <td>{{ item.quantity }}</td>
                        <td class="text-end pe-3 fw-semibold">{{ formatCurrency(item.price * item.quantity) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="card mb-4" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
              <div class="card-header" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'">
                <h6 class="fw-semibold mb-0" [style.color]="'var(--text-primary)'">
                  <i class="bi bi-receipt me-2" [style.color]="'var(--primary)'"></i>Order Totals
                </h6>
              </div>
              <div class="card-body">
                <div class="d-flex justify-content-between mb-2">
                  <span [style.color]="'var(--text-secondary)'">Subtotal</span>
                  <span class="fw-medium" [style.color]="'var(--text-primary)'">{{ formatCurrency(subtotal()) }}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                  <span [style.color]="'var(--text-secondary)'">Shipping</span>
                  <span class="fw-medium" [style.color]="'var(--text-primary)'">{{ formatCurrency(shippingCost()) }}</span>
                </div>
                @if (discountAmount() > 0) {
                  <div class="d-flex justify-content-between mb-2">
                    <span [style.color]="'var(--text-secondary)'">Discount</span>
                    <span class="fw-medium" style="color: #f87171;">-{{ formatCurrency(discountAmount()) }}</span>
                  </div>
                }
                <hr [style.border-color]="'var(--border-color)'" />
                <div class="d-flex justify-content-between">
                  <span class="fw-bold fs-5" [style.color]="'var(--text-primary)'">Total</span>
                  <span class="fw-bold fs-5" [style.color]="'var(--primary)'">{{ formatCurrency(order()!.total) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-4">
            <div class="card mb-4" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
              <div class="card-header" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'">
                <h6 class="fw-semibold mb-0" [style.color]="'var(--text-primary)'">
                  <i class="bi bi-person me-2" [style.color]="'var(--primary)'"></i>Coordonnées du client
                </h6>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <small class="d-block mb-1" [style.color]="'var(--text-muted)'"><i class="bi bi-person-fill me-1"></i>Nom complet</small>
                  <span class="fw-medium" [style.color]="'var(--text-primary)'">{{ order()!.shipping_name || getFullName() || 'N/A' }}</span>
                </div>
                <div class="mb-3">
                  <small class="d-block mb-1" [style.color]="'var(--text-muted)'"><i class="bi bi-geo-alt-fill me-1"></i>Adresse</small>
                  <span class="fw-medium" [style.color]="'var(--text-primary)'">{{ order()!.shipping_address || 'N/A' }}</span>
                </div>
                <div class="mb-3">
                  <small class="d-block mb-1" [style.color]="'var(--text-muted)'"><i class="bi bi-telephone-fill me-1"></i>Téléphone</small>
                  <a [href]="'tel:' + order()!.shipping_phone" class="fw-medium" [style.color]="'var(--primary)'" style="text-decoration: none;">{{ order()!.shipping_phone || 'N/A' }}</a>
                </div>
              </div>
            </div>

            <div class="card mb-4" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
              <div class="card-header" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'">
                <h6 class="fw-semibold mb-0" [style.color]="'var(--text-primary)'">
                  <i class="bi bi-arrow-repeat me-2" [style.color]="'var(--primary)'"></i>Update Status
                </h6>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <label class="form-label small fw-semibold">New Status</label>
                  <select class="form-select" [(ngModel)]="newStatus">
                    @for (s of statusOptions; track s) {
                      <option [value]="s">{{ s | titlecase }}</option>
                    }
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label small fw-semibold">Note (optional)</label>
                  <textarea
                    class="form-control"
                    rows="3"
                    [(ngModel)]="statusNote"
                    placeholder="Add a note about this status change..."
                    [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'"
                  ></textarea>
                </div>
                <button
                  class="btn btn-primary w-100"
                  [disabled]="updatingStatus() || newStatus === order()!.status"
                  (click)="updateStatus()"
                >
                  @if (updatingStatus()) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                  }
                  Update Status
                </button>
              </div>
            </div>

            @if (order()!.status_history && order()!.status_history!.length > 0) {
              <div class="card mb-4" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
                <div class="card-header" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'">
                  <h6 class="fw-semibold mb-0" [style.color]="'var(--text-primary)'">
                    <i class="bi bi-clock-history me-2" [style.color]="'var(--primary)'"></i>Status Timeline
                  </h6>
                </div>
                <div class="card-body">
                  <div class="timeline">
                    @for (entry of order()!.status_history; track entry.timestamp; let i = $index) {
                      <div class="timeline-item" [class.timeline-first]="i === 0">
                        <div class="timeline-marker" [class.bg-primary]="i === 0" [class.bg-secondary]="i !== 0"></div>
                        <div class="timeline-content">
                          <div class="d-flex justify-content-between align-items-start">
                            <span class="badge" [ngClass]="statusBadgeClass(entry.status)">{{ entry.status }}</span>
                            <small [style.color]="'var(--text-muted)'">{{ formatDateTime(entry.timestamp) }}</small>
                          </div>
                          @if (entry.note) {
                            <p class="small mt-1 mb-0" [style.color]="'var(--text-secondary)'">{{ entry.note }}</p>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            } @else {
              <div class="card mb-4" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
                <div class="card-header" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'">
                  <h6 class="fw-semibold mb-0" [style.color]="'var(--text-primary)'">
                    <i class="bi bi-clock-history me-2" [style.color]="'var(--primary)'"></i>Status Timeline
                  </h6>
                </div>
                <div class="card-body">
                  <div class="status-progression">
                    @for (s of statusOptions; track s) {
                      <div class="d-flex align-items-center gap-3 mb-3" [style.color]="!isStatusReached(s) ? 'var(--text-muted)' : 'var(--text-primary)'" [class.fw-semibold]="isStatusReached(s)">
                        <div
                          class="rounded-circle d-flex align-items-center justify-content-center"
                          style="width: 32px; height: 32px; min-width: 32px;"
                          [class.bg-primary]="isStatusCurrentOrPast(s)"
                          [style.background]="!isStatusCurrentOrPast(s) ? 'var(--border-color)' : ''"
                          [class.text-white]="isStatusCurrentOrPast(s)"
                        >
                          @if (isStatusCurrentOrPast(s)) {
                            <i class="bi bi-check-lg"></i>
                          } @else {
                            <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
                          }
                        </div>
                        <div class="flex-grow-1">
                          <span class="text-capitalize" [style.color]="'var(--text-primary)'">{{ s }}</span>
                          @if (s === order()!.status) {
                            <span class="badge bg-primary ms-2">Current</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            @if (orderNotes().length > 0) {
              <div class="card mb-4" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
                <div class="card-header" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'">
                  <h6 class="fw-semibold mb-0" [style.color]="'var(--text-primary)'">
                    <i class="bi bi-journal-text me-2" [style.color]="'var(--primary)'"></i>Notes
                  </h6>
                </div>
                <div class="card-body">
                  @for (note of orderNotes(); track note.id) {
                    <div class="mb-2 pb-2" [style.border-bottom]="'1px solid var(--border-color)'">
                      <small class="d-block mb-1" [style.color]="'var(--text-muted)'">{{ note.created_at | date:'medium' }}</small>
                      <p class="mb-0" [style.color]="'var(--text-primary)'">{{ note.note }}</p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="text-center py-5">
          <i class="bi bi-exclamation-circle fs-1 d-block mb-2" [style.color]="'var(--text-muted)'"></i>
          <span [style.color]="'var(--text-muted)'">Order not found</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .timeline {
      position: relative;
      padding-left: 24px;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 11px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: var(--border-color);
    }
    .timeline-item {
      position: relative;
      padding-bottom: 1.25rem;
    }
    .timeline-item:last-child {
      padding-bottom: 0;
    }
    .timeline-marker {
      position: absolute;
      left: -24px;
      top: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 3px solid var(--bg-surface-alt);
      box-shadow: 0 0 0 2px var(--border-color);
      z-index: 1;
    }
    .timeline-first .timeline-marker {
      box-shadow: 0 0 0 2px var(--primary);
    }
    @media (max-width: 991.98px) {
      .order-detail-stack { flex-direction: column-reverse !important; }
    }
    @media (max-width: 767.98px) {
      .order-info-grid .col-md-4 { flex: 0 0 50%; max-width: 50%; }
      .order-items-table td, .order-items-table th { padding: 0.4rem 0.5rem; font-size: 0.8rem; }
    }
  `],
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  order = signal<Order | null>(null);
  loading = signal(true);
  updatingStatus = signal(false);
  newStatus = '';
  statusNote = '';

  orderNotes = computed(() => {
    const o = this.order();
    if (!o || !o.notes) return [];
    return Array.isArray(o.notes) ? o.notes as any[] : [];
  });

  statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  private statusOrder = ['pending', 'processing', 'shipped', 'delivered'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadOrder(id);
    } else {
      this.loading.set(false);
    }
  }

  loadOrder(id: number): void {
    this.loading.set(true);
    this.api.adminGetOrderDetail(id).subscribe({
      next: (res) => {
        const o = res.order || res;
        this.order.set(o);
        this.newStatus = o.status;
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load order details');
        this.loading.set(false);
      },
    });
  }

  updateStatus(): void {
    const o = this.order();
    if (!o || this.newStatus === o.status) return;
    this.updatingStatus.set(true);
    this.api.adminUpdateOrderStatus(o.id, this.newStatus, this.statusNote || undefined).subscribe({
      next: (res) => {
        const updated = res.order || res;
        this.order.set({ ...o, status: this.newStatus as Order['status'], notes: this.statusNote || o.notes });
        if (updated.status_history) {
          this.order.update((ord) => ord ? { ...ord, status_history: updated.status_history } : ord);
        }
        this.statusNote = '';
        this.toast.success(`Order status updated to ${this.newStatus}`);
        this.updatingStatus.set(false);
      },
      error: () => {
        this.toast.error('Failed to update order status');
        this.updatingStatus.set(false);
      },
    });
  }

  subtotal(): number {
    const o = this.order();
    if (!o) return 0;
    return (o.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  shippingCost(): number {
    const o = this.order();
    if (!o) return 0;
    return Math.max(0, o.total - this.subtotal() + this.discountAmount());
  }

  discountAmount(): number {
    const o = this.order();
    if (!o) return 0;
    const sub = this.subtotal();
    const total = o.total;
    if (sub > total) return sub - total;
    return 0;
  }

  isStatusReached(status: string): boolean {
    const o = this.order();
    if (!o) return false;
    const currentIdx = this.statusOrder.indexOf(o.status);
    const checkIdx = this.statusOrder.indexOf(status);
    if (o.status === 'cancelled') {
      return status === 'pending' || status === o.status;
    }
    return checkIdx <= currentIdx;
  }

  isStatusCurrentOrPast(status: string): boolean {
    return this.isStatusReached(status);
  }

  getFullName(): string {
    const o = this.order();
    if (!o) return '';
    const parts = [o.shipping_prenom, o.shipping_nom].filter(p => p && p.trim());
    return parts.join(' ');
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-warning text-dark',
      processing: 'bg-info text-dark',
      shipped: 'bg-primary',
      delivered: 'bg-success',
      cancelled: 'bg-danger',
    };
    return map[status] || 'bg-secondary';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(value || 0);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
