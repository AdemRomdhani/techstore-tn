import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { Order } from '../../core/models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="orders-page px-2 px-sm-3 py-3 py-md-4">
      <!-- Header -->
      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3 mb-md-4">
        <div>
          <h2 class="fw-bold mb-0" [style.color]="'var(--text-primary)'" style="font-size: clamp(1.1rem, 3vw, 1.5rem);">Orders</h2>
          <small class="d-none d-sm-block" [style.color]="'var(--text-muted)'">Manage and track all customer orders</small>
        </div>
        <button class="btn btn-sm" style="background: #10b981; color: #fff; border: none;" (click)="exportCsv()">
          <i class="bi bi-download me-1"></i><span class="d-none d-sm-inline">Export CSV</span><span class="d-sm-none">Export</span>
        </button>
      </div>

      <!-- Stat Cards -->
      <div class="row g-2 g-md-3 mb-3 mb-md-4">
        <div class="col-6 col-md-3">
          <div class="card h-100" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
            <div class="card-body text-center p-2 p-md-3">
              <div class="fw-bold" [style.color]="'var(--primary)'" style="font-size: clamp(0.95rem, 2.5vw, 1.1rem);">{{ totalCount() }}</div>
              <div [style.color]="'var(--text-muted)'" style="font-size: 0.7rem;">Total</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card h-100" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
            <div class="card-body text-center p-2 p-md-3">
              <div class="fw-bold" style="color: #10b981; font-size: clamp(0.95rem, 2.5vw, 1.1rem);">{{ formatCurrency(totalRevenue()) }}</div>
              <div [style.color]="'var(--text-muted)'" style="font-size: 0.7rem;">Revenue</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card h-100" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
            <div class="card-body text-center p-2 p-md-3">
              <div class="fw-bold" style="color: #f59e0b; font-size: clamp(0.95rem, 2.5vw, 1.1rem);">{{ pendingCount() }}</div>
              <div [style.color]="'var(--text-muted)'" style="font-size: 0.7rem;">Pending</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card h-100" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
            <div class="card-body text-center p-2 p-md-3">
              <div class="fw-bold" style="color: #06b6d4; font-size: clamp(0.95rem, 2.5vw, 1.1rem);">{{ shippedCount() }}</div>
              <div [style.color]="'var(--text-muted)'" style="font-size: 0.7rem;">Shipped</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card mb-3 mb-md-4" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
        <div class="card-body p-2 p-md-3">
          <div class="row g-2 g-md-3 align-items-end">
            <div class="col-12 col-md-3">
              <label class="form-label small fw-semibold mb-1" [style.color]="'var(--text-secondary)'">Search</label>
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="ID or customer name..."
                [ngModel]="searchTerm()"
                (ngModelChange)="searchTerm.set($event)"
                [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'"
              />
            </div>
            <div class="col-6 col-md-2">
              <label class="form-label small fw-semibold mb-1" [style.color]="'var(--text-secondary)'">Status</label>
              <select class="form-select form-select-sm" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div class="col-6 col-md-2">
              <label class="form-label small fw-semibold mb-1" [style.color]="'var(--text-secondary)'">From</label>
              <input
                type="date"
                class="form-control form-control-sm"
                [ngModel]="dateStart()"
                (ngModelChange)="dateStart.set($event)"
                [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'"
              />
            </div>
            <div class="col-6 col-md-2">
              <label class="form-label small fw-semibold mb-1" [style.color]="'var(--text-secondary)'">To</label>
              <input
                type="date"
                class="form-control form-control-sm"
                [ngModel]="dateEnd()"
                (ngModelChange)="dateEnd.set($event)"
                [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'"
              />
            </div>
            <div class="col-6 col-md-auto d-flex gap-1">
              <button class="btn btn-sm btn-outline-secondary flex-grow-1 flex-md-grow-0" (click)="resetFilters()" title="Reset" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-secondary)'">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
              <button class="btn btn-sm btn-primary flex-grow-1 flex-md-grow-0" (click)="loadOrders()">
                <i class="bi bi-funnel me-1"></i><span class="d-none d-md-inline">Filter</span><span class="d-md-none">Go</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Orders Table -->
      @if (loading()) {
        <app-loading-spinner message="Loading orders..." />
      } @else {
        <div class="card" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead [style.background]="'var(--bg-surface-alt)'">
                <tr>
                  <th class="ps-3" style="font-size: 0.7rem; white-space: nowrap;" [style.color]="'var(--text-secondary)'">ID</th>
                  <th style="font-size: 0.7rem; white-space: nowrap;" [style.color]="'var(--text-secondary)'">Client</th>
                  <th class="d-mobile-none" style="font-size: 0.7rem; white-space: nowrap;" [style.color]="'var(--text-secondary)'">Items</th>
                  <th style="font-size: 0.7rem; white-space: nowrap;" [style.color]="'var(--text-secondary)'">Total</th>
                  <th class="d-mobile-none" style="font-size: 0.7rem; white-space: nowrap;" [style.color]="'var(--text-secondary)'">Payment</th>
                  <th style="font-size: 0.7rem; white-space: nowrap;" [style.color]="'var(--text-secondary)'">Status</th>
                  <th class="d-mobile-none" style="font-size: 0.7rem; white-space: nowrap;" [style.color]="'var(--text-secondary)'">Date</th>
                  <th class="text-end pe-3" style="font-size: 0.7rem; white-space: nowrap;" [style.color]="'var(--text-secondary)'">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (order of filteredOrders(); track order.id) {
                  <tr [style.border-color]="'var(--border-color)'">
                    <td class="ps-3">
                      <span class="fw-bold" [style.color]="'var(--primary)'" style="font-size: 0.8rem;">#{{ order.id }}</span>
                    </td>
                    <td style="max-width: 120px;">
                      <div [style.color]="'var(--text-primary)'" style="font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ order.shipping_name || order.user_name || 'N/A' }}</div>
                      <small class="d-none d-md-block" [style.color]="'var(--text-muted)'">{{ order.shipping_phone || order.user_email || '' }}</small>
                    </td>
                    <td class="d-mobile-none">
                      <span class="badge" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" style="font-size: 0.7rem;">{{ order.item_count || order.items?.length || 0 }}</span>
                    </td>
                    <td>
                      <span class="fw-semibold" style="color: #10b981; font-size: 0.8rem;">{{ formatCurrency(order.total) }}</span>
                    </td>
                    <td class="d-mobile-none">
                      <span [style.color]="'var(--text-primary)'" style="text-transform: capitalize; font-size: 0.8rem;">{{ order.payment_method || 'N/A' }}</span>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="statusBadgeClass(order.status)" style="font-size: 0.65rem;">{{ order.status }}</span>
                    </td>
                    <td class="d-mobile-none">
                      <span [style.color]="'var(--text-muted)'" style="font-size: 0.75rem;">{{ formatDate(order.created_at) }}</span>
                    </td>
                    <td class="text-end pe-3">
                      <div class="d-flex gap-1 justify-content-end align-items-center">
                        <div class="dropdown">
                          <button
                            class="btn btn-sm dropdown-toggle"
                            style="background: rgba(14, 165, 233, 0.15); border: none; font-size: 0.75rem;"
                            [style.color]="'var(--primary)'"
                            type="button"
                            data-bs-toggle="dropdown"
                            title="Change status"
                          >
                            Status
                          </button>
                          <ul class="dropdown-menu dropdown-menu-end">
                            @for (s of statusOptions; track s) {
                              <li>
                                <button
                                  class="dropdown-item"
                                  [class.active]="order.status === s"
                                  (click)="updateStatus(order, s)"
                                >
                                  {{ s | titlecase }}
                                </button>
                              </li>
                            }
                          </ul>
                        </div>
                        <a
                          class="btn btn-sm p-1"
                          [routerLink]="['/orders', order.id]"
                          style="background: rgba(14, 165, 233, 0.15); border: none;"
                          [style.color]="'var(--primary)'"
                          title="View details"
                        >
                          <i class="bi bi-eye"></i>
                        </a>
                        <button
                          class="btn btn-sm p-1"
                          style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: none;"
                          (click)="confirmDelete(order)"
                          title="Delete"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="text-center py-5">
                      <i class="bi bi-inbox fs-1 d-block mb-2" [style.color]="'var(--text-muted)'"></i>
                      <span [style.color]="'var(--text-muted)'">No orders found</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>

    @if (showDeleteConfirm()) {
      <div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);" (click)="showDeleteConfirm.set(false)">
        <div class="modal-dialog modal-sm modal-dialog-centered" (click)="$event.stopPropagation()">
          <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;" [style.background]="'var(--bg-surface)'">
            <div class="modal-body text-center py-4">
              <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width: 56px; height: 56px; background: rgba(239, 68, 68, 0.15);">
                <i class="bi bi-exclamation-triangle fs-4" style="color: #f87171;"></i>
              </div>
              <h6 class="fw-bold" [style.color]="'var(--text-primary)'">Delete Order?</h6>
              <p class="small mb-0" [style.color]="'var(--text-muted)'">Order #{{ deleteTarget()?.id }} will be permanently deleted. Stock will be restored.</p>
            </div>
            <div class="modal-footer border-0 justify-content-center pt-0 pb-3">
              <button type="button" class="btn btn-sm" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" style="border: none;" (click)="showDeleteConfirm.set(false)">Cancel</button>
              <button type="button" class="btn btn-danger btn-sm" [disabled]="deleting()" (click)="deleteOrder()">
                @if (deleting()) { <span class="spinner-border spinner-border-sm me-1"></span> }
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class OrdersComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  orders = signal<Order[]>([]);
  loading = signal(false);
  searchTerm = signal('');
  statusFilter = signal('');
  dateStart = signal('');
  dateEnd = signal('');
  showDeleteConfirm = signal(false);
  deleteTarget = signal<Order | null>(null);
  deleting = signal(false);

  statusOptions = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  filteredOrders = computed(() => {
    let result = this.orders();
    const search = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();

    if (search) {
      result = result.filter(
        (o) =>
          String(o.id).includes(search) ||
          (o.user_name && o.user_name.toLowerCase().includes(search)) ||
          (o.user_email && o.user_email.toLowerCase().includes(search)) ||
          ((o as any).shipping_name && (o as any).shipping_name.toLowerCase().includes(search)) ||
          ((o as any).shipping_phone && (o as any).shipping_phone.toLowerCase().includes(search))
      );
    }

    if (status) {
      result = result.filter((o) => o.status === status);
    }

    return result;
  });

  totalCount = computed(() => this.orders().length);
  totalRevenue = computed(() => this.orders().reduce((sum, o) => sum + (o.total || 0), 0));
  pendingCount = computed(() => this.orders().filter((o) => o.status === 'pending').length);
  shippedCount = computed(() => this.orders().filter((o) => o.status === 'shipped').length);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    const params: any = {};
    if (this.statusFilter()) params.status = this.statusFilter();
    if (this.dateStart()) params.start = this.dateStart();
    if (this.dateEnd()) params.end = this.dateEnd();

    this.api.adminGetAllOrders(params).subscribe({
      next: (res) => {
        this.orders.set(res.orders || res.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load orders');
        this.loading.set(false);
      },
    });
  }

  updateStatus(order: Order, newStatus: string): void {
    if (order.status === newStatus) return;
    this.api.adminUpdateOrderStatus(order.id, newStatus).subscribe({
      next: () => {
        this.orders.update((list) =>
          list.map((o) => (o.id === order.id ? { ...o, status: newStatus as Order['status'] } : o))
        );
        this.toast.success(`Order #${order.id} updated to ${newStatus}`);
      },
      error: () => {
        this.toast.error('Failed to update order status');
      },
    });
  }

  exportCsv(): void {
    const params: any = {};
    if (this.statusFilter()) params.status = this.statusFilter();
    if (this.dateStart()) params.start = this.dateStart();
    if (this.dateEnd()) params.end = this.dateEnd();

    this.api.adminExportOrders(params).subscribe({
      next: (csvContent) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.toast.success('Orders exported successfully');
      },
      error: () => {
        this.toast.error('Failed to export orders');
      },
    });
  }

  confirmDelete(order: Order): void {
    this.deleteTarget.set(order);
    this.showDeleteConfirm.set(true);
  }

  deleteOrder(): void {
    const order = this.deleteTarget();
    if (!order || this.deleting()) return;
    this.deleting.set(true);
    this.api.adminDeleteOrder(order.id).subscribe({
      next: () => {
        this.toast.success(`Order #${order.id} deleted`);
        this.showDeleteConfirm.set(false);
        this.deleteTarget.set(null);
        this.deleting.set(false);
        this.loadOrders();
      },
      error: () => {
        this.toast.error('Failed to delete order');
        this.deleting.set(false);
      },
    });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.dateStart.set('');
    this.dateEnd.set('');
    this.loadOrders();
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
      month: 'short',
      day: 'numeric',
    });
  }
}
