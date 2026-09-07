import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

interface Coupon {
  id: number;
  code: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  expires_at: string;
  active: number;
}

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-fluid py-3 py-md-4 px-2 px-sm-3">
      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3 mb-md-4">
        <div>
          <h4 class="fw-bold mb-0" [style.color]="'var(--text-primary)'" style="font-size: clamp(1rem, 3vw, 1.25rem);">Coupons</h4>
          <small class="d-none d-md-block" style="color: var(--text-muted);">{{ coupons().length }} coupons total</small>
        </div>
        <button class="btn btn-primary btn-sm" (click)="openAddModal()">
          <i class="bi bi-plus-lg me-1"></i> <span class="d-none d-sm-inline">Add Coupon</span><span class="d-sm-none">Add</span>
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Loading coupons..."></app-loading-spinner>
      } @else {
        <div class="card" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'" style="border-radius: 12px;">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead [style.background]="'var(--bg-surface-alt)'">
                <tr>
                  <th class="border-0 ps-3 fw-semibold" style="font-size: 0.75rem;">Code</th>
                  <th class="border-0 fw-semibold" style="font-size: 0.75rem;">Discount</th>
                  <th class="d-mobile-none border-0 fw-semibold" style="font-size: 0.75rem;">Max Uses</th>
                  <th class="border-0 fw-semibold" style="font-size: 0.75rem;">Usage</th>
                  <th class="d-mobile-none border-0 fw-semibold" style="font-size: 0.75rem;">Expires</th>
                  <th class="border-0 fw-semibold" style="font-size: 0.75rem;">Status</th>
                  <th class="border-0 pe-3 fw-semibold text-end" style="font-size: 0.75rem;">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (coupon of coupons(); track coupon.id) {
                  <tr>
                    <td class="ps-3">
                      <span class="fw-bold" [style.color]="'var(--primary)'" style="letter-spacing: 1px; font-size: 0.85rem;">{{ coupon.code }}</span>
                    </td>
                    <td>
                      <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">{{ coupon.discount_percent }}%</span>
                    </td>
                    <td class="d-mobile-none">{{ coupon.max_uses || 'Unlimited' }}</td>
                    <td>
                      @if (coupon.max_uses) {
                        <div class="d-flex align-items-center gap-2">
                          <div class="progress flex-grow-1" style="height: 6px; min-width: 50px;">
                            <div class="progress-bar"
                                 [class.bg-warning]="getUsagePercent(coupon) > 50 && getUsagePercent(coupon) < 80"
                                 [class.bg-danger]="getUsagePercent(coupon) >= 80"
                                 [class.bg-success]="getUsagePercent(coupon) <= 50"
                                 role="progressbar"
                                 [style.width.%]="getUsagePercent(coupon)">
                            </div>
                          </div>
                          <small [style.color]="'var(--text-muted)'" style="font-size: 0.75rem;">{{ coupon.used_count }}/{{ coupon.max_uses }}</small>
                        </div>
                      } @else {
                        <small style="color: var(--text-muted);">{{ coupon.used_count }} used</small>
                      }
                    </td>
                    <td class="d-mobile-none">
                      @if (coupon.expires_at) {
                        <span [style.color]="isExpired(coupon) ? '#f87171' : 'var(--text-muted)'">
                          {{ formatDate(coupon.expires_at) }}
                        </span>
                      } @else {
                        <span style="color: var(--text-muted);">Never</span>
                      }
                    </td>
                    <td>
                      @if (coupon.active) {
                        <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">Active</span>
                      } @else {
                        <span class="badge" style="background: var(--border-color); color: var(--text-muted);">Inactive</span>
                      }
                    </td>
                    <td class="pe-3 text-end">
                      <div class="d-flex gap-1 justify-content-end">
                        <button class="btn btn-sm btn-outline-primary" (click)="openEditModal(coupon)">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" (click)="confirmDelete(coupon)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="text-center py-5">
                      <i class="bi bi-ticket fs-1" [style.color]="'var(--text-muted)'"></i>
                      <p class="mt-2 mb-0" style="color: var(--text-muted);">No coupons found</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>

    @if (showModal()) {
      <div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);" (click)="closeModal()">
        <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
          <div class="modal-content border-0 shadow-lg" [style.background]="'var(--bg-surface)'" style="border-radius: 16px;">
            <div class="modal-header border-0 pb-0" [style.border-color]="'var(--border-color) !important'">
              <h5 class="fw-bold" style="color: var(--text-primary);">{{ editingCoupon() ? 'Edit Coupon' : 'Add Coupon' }}</h5>
              <button type="button" class="btn-close" (click)="closeModal()"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-semibold">Code</label>
                <input type="text" class="form-control text-uppercase" [(ngModel)]="formData.code" placeholder="e.g. SUMMER20"
                       style="letter-spacing: 2px;">
              </div>
              <div class="row g-3">
                <div class="col-6">
                  <label class="form-label fw-semibold">Discount %</label>
                  <div class="input-group">
                    <input type="number" class="form-control" [(ngModel)]="formData.discount_percent" min="1" max="100" placeholder="10">
                    <span class="input-group-text">%</span>
                  </div>
                </div>
                <div class="col-6">
                  <label class="form-label fw-semibold">Max Uses</label>
                  <input type="number" class="form-control" [(ngModel)]="formData.max_uses" min="0" placeholder="0 = unlimited">
                  <small style="color: var(--text-muted);">0 = unlimited</small>
                </div>
              </div>
              <div class="mb-3 mt-3">
                <label class="form-label fw-semibold">Expires At</label>
                <input type="date" class="form-control" [(ngModel)]="formData.expires_at">
              </div>
              <div class="mb-3">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="couponActive" [(ngModel)]="formData.active">
                  <label class="form-check-label fw-semibold" for="couponActive">Active</label>
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0" [style.border-color]="'var(--border-color)'">
              <button type="button" class="btn" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" [style.border]="'none'" (click)="closeModal()">Cancel</button>
              <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="saveCoupon()">
                @if (saving()) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                }
                {{ editingCoupon() ? 'Update' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (showDeleteConfirm()) {
      <div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);" (click)="showDeleteConfirm.set(false)">
        <div class="modal-dialog modal-sm modal-dialog-centered" (click)="$event.stopPropagation()">
          <div class="modal-content border-0 shadow-lg" [style.background]="'var(--bg-surface)'" style="border-radius: 12px;">
            <div class="modal-body text-center py-4">
              <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style="width: 56px; height: 56px; background: rgba(239, 68, 68, 0.15);">
                <i class="bi bi-exclamation-triangle fs-4" style="color: #f87171;"></i>
              </div>
              <h6 class="fw-bold" [style.color]="'var(--text-primary)'">Delete Coupon?</h6>
              <p class="small mb-0" [style.color]="'var(--text-muted)'">"{{ deleteTarget()?.code }}" will be permanently removed.</p>
            </div>
            <div class="modal-footer border-0 justify-content-center pt-0 pb-3" [style.border-color]="'var(--border-color)'">
              <button type="button" class="btn btn-sm" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" [style.border]="'none'" (click)="showDeleteConfirm.set(false)">Cancel</button>
              <button type="button" class="btn btn-danger btn-sm" [disabled]="deleting()" (click)="deleteCoupon()">
                @if (deleting()) {
                  <span class="spinner-border spinner-border-sm me-1"></span>
                }
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class CouponsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  coupons = signal<Coupon[]>([]);
  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);
  showModal = signal(false);
  showDeleteConfirm = signal(false);
  editingCoupon = signal<Coupon | null>(null);
  deleteTarget = signal<Coupon | null>(null);

  formData = {
    code: '',
    discount_percent: 10,
    max_uses: 0,
    expires_at: '',
    active: 1,
  };

  ngOnInit(): void {
    this.loadCoupons();
  }

  loadCoupons(): void {
    this.loading.set(true);
    this.api.adminGetCoupons().subscribe({
      next: (res) => {
        this.coupons.set(res.coupons || res.data || res);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load coupons');
        this.loading.set(false);
      },
    });
  }

  openAddModal(): void {
    this.editingCoupon.set(null);
    this.formData = { code: '', discount_percent: 10, max_uses: 0, expires_at: '', active: 1 };
    this.showModal.set(true);
  }

  openEditModal(coupon: Coupon): void {
    this.editingCoupon.set(coupon);
    this.formData = {
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      max_uses: coupon.max_uses || 0,
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      active: coupon.active,
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingCoupon.set(null);
  }

  saveCoupon(): void {
    if (!this.formData.code.trim()) {
      this.toast.warning('Coupon code is required');
      return;
    }
    if (this.formData.discount_percent < 1 || this.formData.discount_percent > 100) {
      this.toast.warning('Discount must be between 1 and 100');
      return;
    }
    this.saving.set(true);
    const payload = { ...this.formData, code: this.formData.code.toUpperCase() };
    const edit = this.editingCoupon();

    const request$ = edit
      ? this.api.adminUpdateCoupon(edit.id, payload)
      : this.api.adminCreateCoupon(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(edit ? 'Coupon updated' : 'Coupon created');
        this.closeModal();
        this.loadCoupons();
        this.saving.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Operation failed');
        this.saving.set(false);
      },
    });
  }

  confirmDelete(coupon: Coupon): void {
    this.deleteTarget.set(coupon);
    this.showDeleteConfirm.set(true);
  }

  deleteCoupon(): void {
    const coupon = this.deleteTarget();
    if (!coupon) return;
    this.deleting.set(true);
    this.api.adminDeleteCoupon(coupon.id).subscribe({
      next: () => {
        this.toast.success('Coupon deleted');
        this.showDeleteConfirm.set(false);
        this.deleteTarget.set(null);
        this.loadCoupons();
        this.deleting.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Delete failed');
        this.deleting.set(false);
      },
    });
  }

  getUsagePercent(coupon: Coupon): number {
    if (!coupon.max_uses) return 0;
    return Math.min((coupon.used_count / coupon.max_uses) * 100, 100);
  }

  isExpired(coupon: Coupon): boolean {
    if (!coupon.expires_at) return false;
    return new Date(coupon.expires_at) < new Date();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
