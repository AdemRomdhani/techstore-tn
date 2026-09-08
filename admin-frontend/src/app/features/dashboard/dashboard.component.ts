import { Component, inject, signal, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';
import { AdminStats, Order } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LoadingSpinnerComponent, ImageUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard fade-in">
      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3 mb-md-4">
        <div>
          <h4 class="fw-bold mb-1" [style.color]="'var(--text-primary)'" style="font-size: clamp(1rem, 3vw, 1.25rem);">Dashboard Overview</h4>
          <p class="small mb-0 d-none d-sm-block" [style.color]="'var(--text-muted)'">Welcome back! Here's what's happening with your store.</p>
        </div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <input type="date" class="form-control form-control-sm" [(ngModel)]="startDate" name="startDate" style="max-width: 150px;">
          <input type="date" class="form-control form-control-sm" [(ngModel)]="endDate" name="endDate" style="max-width: 150px;">
          <button class="btn btn-primary btn-sm" (click)="refreshStats()">
            <i class="bi bi-arrow-clockwise me-1"></i> <span class="d-none d-sm-inline">Refresh</span><span class="d-sm-none">Go</span>
          </button>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Loading dashboard..."></app-loading-spinner>
      } @else if (error()) {
        <div class="alert alert-danger d-flex align-items-center">
          <i class="bi bi-exclamation-circle me-2"></i>
          {{ error() }}
          <button class="btn btn-sm btn-outline-danger ms-auto" (click)="loadStats()">Retry</button>
        </div>
      } @else if (stats()) {
        <!-- Stat Cards -->
        <div class="row g-2 g-md-3 mb-3 mb-md-4">
          <div class="col-6 col-md-6 col-xl-3">
            <div class="card stat-card p-2 p-md-3">
              <div class="d-flex align-items-center gap-2 gap-md-3">
                <div class="stat-icon bg-success bg-opacity-10 text-success rounded">
                  <i class="bi bi-currency-dollar"></i>
                </div>
                <div>
                  <div class="stat-value">{{ stats()!.totalRevenue | number:'1.2-2' }}</div>
                  <div class="stat-label">{{ i18n.t('totalRevenue') }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-6 col-xl-3">
            <div class="card stat-card p-2 p-md-3">
              <div class="d-flex align-items-center gap-2 gap-md-3">
                <div class="stat-icon bg-primary bg-opacity-10 text-primary rounded">
                  <i class="bi bi-cart-check"></i>
                </div>
                <div>
                  <div class="stat-value">{{ stats()!.totalOrders }}</div>
                  <div class="stat-label">{{ i18n.t('totalOrders') }}</div>
                  @if (stats()!.pendingOrders > 0) {
                    <small class="text-warning"><i class="bi bi-clock me-1"></i>{{ stats()!.pendingOrders }} pending</small>
                  }
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-6 col-xl-3">
            <div class="card stat-card p-2 p-md-3">
              <div class="d-flex align-items-center gap-2 gap-md-3">
                <div class="stat-icon bg-warning bg-opacity-10 text-warning rounded">
                  <i class="bi bi-box-seam"></i>
                </div>
                <div>
                  <div class="stat-value">{{ stats()!.totalProducts }}</div>
                  <div class="stat-label">{{ i18n.t('totalProducts') }}</div>
                  @if (stats()!.lowStockProducts > 0) {
                    <small class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>{{ stats()!.lowStockProducts }} low stock</small>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-3 g-md-4 mb-3 mb-md-4">
          <!-- Revenue Chart -->
          <div class="col-lg-8">
            <div class="card p-3 p-md-4">
              <h6 class="fw-bold mb-3" [style.color]="'var(--text-primary)'" style="font-size: clamp(0.85rem, 2vw, 1rem);">Revenue Overview</h6>
              <div class="bar-chart d-flex align-items-end gap-1 gap-md-2" style="height: 160px; overflow-x: auto;">
                @for (day of revenueByDay(); track day.date) {
                  <div class="d-flex flex-column align-items-center flex-grow-1" style="height: 100%; justify-content: flex-end; min-width: 28px;">
                    <small class="mb-1 d-none d-md-block" style="font-size: 0.65rem;" [style.color]="'var(--text-muted)'">{{ formatCurrency(day.revenue) }}</small>
                    <div
                      class="bar rounded-top w-100"
                      [style.height.%]="getBarHeight(day.revenue)"
                      [style.background]="getBarColor(day.revenue)"
                      style="min-height: 4px; transition: height 0.5s ease;"
                    ></div>
                    <small class="mt-1 text-center" style="font-size: 0.55rem; white-space: nowrap;" [style.color]="'var(--text-muted)'">{{ formatDayLabel(day.date) }}</small>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Orders by Status -->
          <div class="col-lg-4">
            <div class="card p-3 p-md-4">
              <h6 class="fw-bold mb-3" [style.color]="'var(--text-primary)'">Orders by Status</h6>
              <div class="d-flex flex-column gap-3">
                @for (status of ordersByStatus(); track status.status) {
                  <div>
                    <div class="d-flex justify-content-between mb-1">
                      <span class="small fw-medium" [style.color]="'var(--text-primary)'" style="text-transform: capitalize;">{{ status.status }}</span>
                      <span class="small" [style.color]="'var(--text-muted)'">{{ status.count }}</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                      <div
                        class="progress-bar"
                        [style.width.%]="getOrderStatusPercent(status.count)"
                        [style.background-color]="getStatusColor(status.status)"
                        role="progressbar"
                        [attr.aria-valuenow]="status.count"
                        [attr.aria-valuemax]="totalOrdersForStatus()"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <div class="row g-3 g-md-4 mb-3 mb-md-4">
          <!-- Recent Orders -->
          <div class="col-lg-8">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center" [style.background]="'var(--bg-surface)'" [style.border-color]="'var(--border-color)'">
                <h6 class="fw-bold mb-0" [style.color]="'var(--text-primary)'" style="font-size: 0.9rem;">{{ i18n.t('recentOrders') }}</h6>
                <a routerLink="/orders" class="btn btn-sm" style="background: transparent; font-size: 0.75rem;" [style.color]="'var(--primary)'" [style.border]="'1px solid var(--primary)'">View All</a>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Client</th>
                        <th class="d-mobile-none">Total</th>
                        <th>Status</th>
                        <th class="d-mobile-none">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (order of stats()!.recentOrders; track order.id) {
                        <tr>
                          <td class="fw-medium" [style.color]="'var(--text-primary)'">#{{ order.id }}</td>
                          <td [style.color]="'var(--text-primary)'" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ order.shipping_name || order.user_name || 'Guest' }}</td>
                          <td class="d-mobile-none" style="color: #10b981;">{{ order.total | number:'1.2-2' }}</td>
                          <td><span class="badge status-{{ order.status }}">{{ order.status }}</span></td>
                          <td class="d-mobile-none" [style.color]="'var(--text-muted)'">{{ order.created_at | date:'shortDate' }}</td>
                        </tr>
                      }
                      @if (!stats()!.recentOrders || stats()!.recentOrders.length === 0) {
                        <tr>
                          <td colspan="5" class="text-center py-4" [style.color]="'var(--text-muted)'">No recent orders</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Top Products -->
          <div class="col-lg-4">
            <div class="card">
              <div class="card-header" [style.background]="'var(--bg-surface)'" [style.border-color]="'var(--border-color)'">
                <h6 class="fw-bold mb-0" [style.color]="'var(--text-primary)'" style="font-size: 0.9rem;">{{ i18n.t('topProducts') }}</h6>
              </div>
              <div class="card-body p-0">
                @for (product of stats()!.topProducts; track product.id; let i = $index) {
                  <div class="d-flex align-items-center gap-3 p-3" [style.border-bottom]="'1px solid var(--border-color)'">
                    <span class="badge rounded-circle" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">{{ i + 1 }}</span>
                    <img [src]="(product.image || 'https://placehold.co/40x40') | imageUrl" [alt]="product.name" class="rounded" style="width: 40px; height: 40px; object-fit: cover;">
                    <div class="flex-grow-1 min-width-0">
                      <div class="fw-medium small text-truncate" [style.color]="'var(--text-primary)'">{{ product.name }}</div>
                      <small [style.color]="'var(--text-muted)'">{{ product.sold || 0 }} sold</small>
                    </div>
                    <div class="text-end">
                      <div class="fw-semibold small" style="color: #10b981;">{{ product.revenue | number:'1.2-2' }}</div>
                    </div>
                  </div>
                }
                @if (!stats()!.topProducts || stats()!.topProducts.length === 0) {
                  <div class="text-center py-4" [style.color]="'var(--text-muted)'">No product data</div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="row g-2 g-md-3">
          <div class="col-6 col-md-6 col-lg-3">
            <a routerLink="/orders" class="quick-action d-block text-decoration-none">
              <div class="p-2 p-md-3 text-center">
                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style="width: 40px; height: 40px; background: rgba(14, 165, 233, 0.15);">
                  <i class="bi bi-cart-check" [style.color]="'var(--primary)'"></i>
                </div>
                <div class="fw-semibold" [style.color]="'var(--text-primary)'" style="font-size: 0.85rem;">{{ i18n.t('viewOrders') }}</div>
                <small class="d-none d-md-block" [style.color]="'var(--text-muted)'">Manage customer orders</small>
              </div>
            </a>
          </div>
          <div class="col-6 col-md-6 col-lg-3">
            <a routerLink="/products" class="quick-action d-block text-decoration-none">
              <div class="p-2 p-md-3 text-center">
                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style="width: 40px; height: 40px; background: rgba(16, 185, 129, 0.15);">
                  <i class="bi bi-box-seam" style="color: #10b981;"></i>
                </div>
                <div class="fw-semibold" [style.color]="'var(--text-primary)'">{{ i18n.t('manageProducts') }}</div>
                <small [style.color]="'var(--text-muted)'">Add or edit products</small>
              </div>
            </a>
          </div>
          <div class="col-6 col-md-6 col-lg-3">
            <a routerLink="/contacts" class="quick-action d-block text-decoration-none">
              <div class="p-2 p-md-3 text-center">
                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style="width: 40px; height: 40px; background: rgba(6, 182, 212, 0.15);">
                  <i class="bi bi-envelope" style="color: #06b6d4;"></i>
                </div>
                <div class="fw-semibold" [style.color]="'var(--text-primary)'" style="font-size: 0.85rem;">{{ i18n.t('viewMessages') }}</div>
                <small class="d-none d-md-block" [style.color]="'var(--text-muted)'">Read customer inquiries</small>
              </div>
            </a>
          </div>
          <div class="col-6 col-md-6 col-lg-3">
            <a routerLink="/settings" class="quick-action d-block text-decoration-none">
              <div class="p-2 p-md-3 text-center">
                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style="width: 40px; height: 40px; background: rgba(245, 158, 11, 0.15);">
                  <i class="bi bi-gear" style="color: #f59e0b;"></i>
                </div>
                <div class="fw-semibold" [style.color]="'var(--text-primary)'" style="font-size: 0.85rem;">{{ i18n.t('settings') }}</div>
                <small class="d-none d-md-block" [style.color]="'var(--text-muted)'">Configure your store</small>
              </div>
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  error = signal('');
  stats = signal<AdminStats | null>(null);

  startDate = '';
  endDate = '';

  revenueByDay = computed(() => this.stats()?.revenueByDay || []);

  ordersByStatus = computed(() => this.stats()?.ordersByStatus || []);

  totalOrdersForStatus = computed(() => {
    const statuses = this.ordersByStatus();
    return statuses.reduce((sum, s) => sum + s.count, 0) || 1;
  });

  maxRevenue = computed(() => {
    const days = this.revenueByDay();
    if (!days.length) return 1;
    return Math.max(...days.map(d => d.revenue), 1);
  });

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.error.set('');

    const params: { start?: string; end?: string } = {};
    if (this.startDate) params.start = this.startDate;
    if (this.endDate) params.end = this.endDate;

    this.api.adminGetRevenueStats(params).subscribe({
      next: (res) => {
        this.stats.set(res.stats || res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message || 'Failed to load dashboard data');
        this.loading.set(false);
      },
    });
  }

  refreshStats(): void {
    this.loadStats();
  }

  getBarHeight(revenue: number): number {
    const max = this.maxRevenue();
    return max > 0 ? (revenue / max) * 100 : 0;
  }

  getBarColor(revenue: number): string {
    if (revenue >= 1000) return '#0ea5e9';
    if (revenue >= 500) return '#06b6d4';
    if (revenue >= 200) return '#22d3ee';
    return '#38bdf8';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      shipped: '#6366f1',
      delivered: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  }

  getOrderStatusPercent(count: number): number {
    const total = this.totalOrdersForStatus();
    return total > 0 ? (count / total) * 100 : 0;
  }

  formatCurrency(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
    return value.toFixed(0);
  }

  formatDayLabel(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()] || '';
  }
}
