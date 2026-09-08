import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

interface Review {
  id: number;
  user_id: number | null;
  product_id: number;
  rating: number;
  comment?: string;
  display_name?: string;
  user_name?: string;
  user_avatar?: string;
  product_name?: string;
  verified?: number;
  created_at?: string;
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-fluid py-3 py-md-4 px-2 px-sm-3">
      <div class="d-flex justify-content-between align-items-center mb-3 mb-md-4">
        <div>
          <h4 class="fw-bold mb-0" [style.color]="'var(--text-primary)'" style="font-size: clamp(1rem, 3vw, 1.25rem);">Reviews</h4>
          <small style="color: var(--text-muted);">{{ reviews().length }} reviews</small>
        </div>
        <div class="d-flex gap-2">
          <select class="form-select form-select-sm" style="width: auto; background: var(--bg-surface); color: var(--text-primary); border-color: var(--border-color);" (change)="filterRating.set($any($event.target).value === 'all' ? null : +$any($event.target).value)">
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Loading reviews..."></app-loading-spinner>
      } @else {
        <div class="card" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'" style="border-radius: 12px;">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr [style.border-color]="'var(--border-color)'">
                  <th class="ps-3" [style.color]="'var(--text-muted)'" style="font-size: 0.8rem;">Customer</th>
                  <th class="d-mobile-none" [style.color]="'var(--text-muted)'" style="font-size: 0.8rem;">Product</th>
                  <th [style.color]="'var(--text-muted)'" style="font-size: 0.8rem;">Rating</th>
                  <th class="d-mobile-none" [style.color]="'var(--text-muted)'" style="font-size: 0.8rem;">Comment</th>
                  <th class="d-mobile-none" [style.color]="'var(--text-muted)'" style="font-size: 0.8rem;">Date</th>
                  <th class="pe-3 text-end" [style.color]="'var(--text-muted)'" style="font-size: 0.8rem;">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (review of filteredReviews(); track review.id) {
                  <tr [style.border-color]="'var(--border-color)'" style="cursor: pointer;" (click)="openReview(review)">
                    <td class="ps-3">
                      <div class="d-flex align-items-center gap-2">
                        @if (review.user_avatar) {
                          <img [src]="review.user_avatar" alt="" class="rounded-circle" style="width: 32px; height: 32px; object-fit: cover;" />
                        } @else {
                          <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; background: var(--border-color);">
                            <i class="bi bi-person" [style.color]="'var(--text-muted)'" style="font-size: 0.85rem;"></i>
                          </div>
                        }
                        <div>
                          <span class="fw-semibold" style="font-size: 0.85rem; color: var(--text-primary);">{{ review.display_name || review.user_name || 'Anonymous' }}</span>
                          @if (review.verified) {
                            <i class="bi bi-patch-check-fill ms-1" style="color: #22c55e; font-size: 0.7rem;"></i>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="d-mobile-none">
                      <span style="font-size: 0.85rem; color: var(--text-primary);">{{ review.product_name || 'Product #' + review.product_id }}</span>
                    </td>
                    <td>
                      <div class="d-flex align-items-center gap-1">
                        @for (s of [1,2,3,4,5]; track s) {
                          <i class="bi" [ngClass]="s <= review.rating ? 'bi-star-fill' : 'bi-star'" [style.color]="s <= review.rating ? '#f59e0b' : 'var(--text-muted)'" style="font-size: 0.8rem;"></i>
                        }
                      </div>
                    </td>
                    <td class="d-mobile-none">
                      <span class="text-truncate d-inline-block" style="max-width: 200px; font-size: 0.85rem; color: var(--text-muted);">{{ review.comment || '—' }}</span>
                    </td>
                    <td class="d-mobile-none">
                      <small style="color: var(--text-muted); font-size: 0.75rem;">{{ formatDate(review.created_at) }}</small>
                    </td>
                    <td class="pe-3 text-end">
                      <button class="btn btn-sm p-1" style="background: none; border: none; color: var(--text-muted);" title="Delete" (click)="$event.stopPropagation(); confirmDelete(review)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center py-5">
                      <i class="bi bi-star fs-1 d-block mb-2" [style.color]="'var(--text-muted)'"></i>
                      <p class="mb-0" style="color: var(--text-muted);">No reviews found</p>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>

    @if (selectedReview()) {
      <div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);" (click)="closeReview()">
        <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
          <div class="modal-content border-0 shadow-lg" [style.background]="'var(--bg-surface)'" style="border-radius: 16px;">
            <div class="modal-header border-0 pb-0" [style.border-color]="'var(--border-color) !important'">
              <h5 class="fw-bold mb-0" style="color: var(--text-primary); font-size: 1rem;">Review Details</h5>
              <button type="button" class="btn-close" (click)="closeReview()"></button>
            </div>
            <div class="modal-body">
              <div class="d-flex align-items-center mb-3">
                @if (selectedReview()?.user_avatar) {
                  <img [src]="selectedReview()?.user_avatar" alt="" class="rounded-circle me-2" style="width: 40px; height: 40px; object-fit: cover;" />
                } @else {
                  <div class="rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 40px; height: 40px; background: var(--border-color);">
                    <i class="bi bi-person" [style.color]="'var(--text-muted)'"></i>
                  </div>
                }
                <div>
                  <div class="fw-semibold" style="color: var(--text-primary);">{{ selectedReview()?.display_name || selectedReview()?.user_name || 'Anonymous' }}</div>
                  <small style="color: var(--text-muted);">{{ formatFullDate(selectedReview()?.created_at) }}</small>
                </div>
                <div class="ms-auto">
                  @for (s of [1,2,3,4,5]; track s) {
                    <i class="bi" [ngClass]="s <= (selectedReview()?.rating || 0) ? 'bi-star-fill' : 'bi-star'" [style.color]="s <= (selectedReview()?.rating || 0) ? '#f59e0b' : 'var(--text-muted)'" style="font-size: 1rem;"></i>
                  }
                </div>
              </div>
              <div class="mb-3 p-3" style="background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-color);">
                <small class="fw-semibold d-block mb-1" style="color: var(--text-muted); font-size: 0.75rem;">PRODUCT</small>
                <span style="color: var(--text-primary);">{{ selectedReview()?.product_name || 'Product #' + selectedReview()?.product_id }}</span>
              </div>
              @if (selectedReview()?.comment) {
                <div class="p-3" style="background: var(--bg-body); border-radius: 8px; border: 1px solid var(--border-color);">
                  <small class="fw-semibold d-block mb-1" style="color: var(--text-muted); font-size: 0.75rem;">COMMENT</small>
                  <p class="mb-0" style="white-space: pre-wrap; line-height: 1.6; color: var(--text-primary);">{{ selectedReview()?.comment }}</p>
                </div>
              }
            </div>
            <div class="modal-footer border-0">
              <button type="button" class="btn btn-sm" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" [style.border]="'none'" (click)="closeReview()">Close</button>
              <button type="button" class="btn btn-danger btn-sm" (click)="confirmDelete(selectedReview()!)">
                <i class="bi bi-trash me-1"></i> Delete
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
              <h6 class="fw-bold" [style.color]="'var(--text-primary)'">Delete Review?</h6>
              <p class="small mb-0" [style.color]="'var(--text-muted)'">This review will be permanently removed.</p>
            </div>
            <div class="modal-footer border-0 justify-content-center pt-0 pb-3" [style.border-color]="'var(--border-color)'">
              <button type="button" class="btn btn-sm" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" [style.border]="'none'" (click)="showDeleteConfirm.set(false)">Cancel</button>
              <button type="button" class="btn btn-danger btn-sm" [disabled]="deleting()" (click)="deleteReview()">
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
export class ReviewsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  reviews = signal<Review[]>([]);
  loading = signal(true);
  deleting = signal(false);
  selectedReview = signal<Review | null>(null);
  showDeleteConfirm = signal(false);
  deleteTarget = signal<Review | null>(null);
  filterRating = signal<number | null>(null);

  filteredReviews = (): Review[] => {
    const rating = this.filterRating();
    if (rating === null) return this.reviews();
    return this.reviews().filter(r => r.rating === rating);
  };

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading.set(true);
    this.api.adminGetAllReviews().subscribe({
      next: (res) => {
        this.reviews.set(res.reviews || []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load reviews');
        this.loading.set(false);
      },
    });
  }

  openReview(review: Review): void {
    this.selectedReview.set(review);
  }

  closeReview(): void {
    this.selectedReview.set(null);
  }

  confirmDelete(review: Review): void {
    this.deleteTarget.set(review);
    this.showDeleteConfirm.set(true);
  }

  deleteReview(): void {
    const review = this.deleteTarget();
    if (!review) return;
    this.deleting.set(true);
    this.api.adminDeleteReview(review.id).subscribe({
      next: () => {
        this.toast.success('Review deleted');
        this.showDeleteConfirm.set(false);
        this.deleteTarget.set(null);
        this.closeReview();
        this.loadReviews();
        this.deleting.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Delete failed');
        this.deleting.set(false);
      },
    });
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatFullDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
