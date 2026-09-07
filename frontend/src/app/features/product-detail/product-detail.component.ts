import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { Product, Review } from '../../core/models';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProductCardComponent, LoadingSpinnerComponent, ImageUrlPipe],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    /* ── Quantity stepper ── */
    .qty-stepper {
      display: inline-flex;
      align-items: center;
      border: 2px solid #334155;
      border-radius: 10px;
      overflow: hidden;
      background: #1e293b;
      user-select: none;
    }
    .qty-btn {
      width: 40px;
      height: 44px;
      border: none;
      background: transparent;
      font-size: 1.3rem;
      font-weight: 600;
      color: #e2e8f0;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qty-btn:hover:not(:disabled) { background: #0ea5e9; color: #fff; }
    .qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .qty-value {
      min-width: 48px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      font-weight: 700;
      color: #e2e8f0;
      border-left: 2px solid #334155;
      border-right: 2px solid #334155;
    }
    .product-gallery-thumb {
      width: 50px; height: 50px; object-fit: cover; border-radius: 8px;
      border: 2px solid #334155; cursor: pointer; flex-shrink: 0; transition: border-color 0.2s;
    }
    @media (min-width: 768px) {
      .product-gallery-thumb { width: 60px; height: 60px; }
    }
    @media (max-width: 576px) {
      .gallery-arrow { width: 34px; height: 34px; font-size: 1rem; }
    }
    .product-gallery-thumb:hover { border-color: #64748b; }
    .product-gallery-thumb.active { border-color: #0ea5e9; }

    /* ── Gallery wrapper ── */
    .gallery-wrapper {
      position: relative;
      overflow: hidden;
      border-radius: 0.375rem;
      background: #0f172a;
      min-height: 380px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: zoom-in;
    }
    @media (min-width: 768px) {
      .gallery-wrapper { min-height: 480px; }
    }
    /* ── Main image - optimized for vertical/portrait ── */
    .gallery-main-img {
      display: block;
      max-height: 620px;
      max-width: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      background: transparent;
      margin: 0 auto;
      transition: transform 0.2s;
    }
    /* Portrait images appear larger - use more vertical space */
    .gallery-main-img.is-portrait {
      max-height: 720px;
    }
    @media (max-width: 576px) {
      .gallery-main-img { max-height: 520px; }
      .gallery-main-img.is-portrait { max-height: 620px; }
    }
    .gallery-wrapper:hover .gallery-main-img {
      transform: scale(1.02);
    }
    /* ── Lightbox ── */
    .lightbox-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0,0,0,0.92);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      cursor: zoom-out;
      animation: fadeIn 0.2s ease;
    }
    .lightbox-overlay img {
      max-width: 96vw;
      max-height: 96vh;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .lightbox-close {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 10000;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.15);
      color: #fff;
      font-size: 1.4rem;
      cursor: pointer;
      backdrop-filter: blur(4px);
    }
    .lightbox-close:hover { background: rgba(255,255,255,0.25); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ── Arrow buttons ── */
    .gallery-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      border: none;
      background: rgba(15, 23, 42, 0.7);
      color: #e2e8f0;
      font-size: 1.2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.2s;
      backdrop-filter: blur(4px);
    }
    .gallery-arrow:hover {
      background: rgba(14, 165, 233, 0.85);
      transform: translateY(-50%) scale(1.1);
    }
    .gallery-arrow.prev { left: 8px; }
    .gallery-arrow.next { right: 8px; }
    @media (min-width: 768px) {
      .gallery-arrow.prev { left: 12px; }
      .gallery-arrow.next { right: 12px; }
    }

    /* ── Slide animation ── */
    .gallery-slide {
      display: block;
      width: 100%;
      animation-duration: 0.35s;
      animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      animation-fill-mode: forwards;
    }
    @keyframes slideFromLeft {
      0%   { opacity: 0; transform: translateX(-60px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideFromRight {
      0%   { opacity: 0; transform: translateX(60px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    .slide-from-left  { animation-name: slideFromLeft; }
    .slide-from-right { animation-name: slideFromRight; }

    /* ── Image counter pill ── */
    .gallery-counter {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.75);
      color: #94a3b8;
      font-size: 0.75rem;
      padding: 2px 12px;
      border-radius: 20px;
      backdrop-filter: blur(4px);
      z-index: 10;
      pointer-events: none;
    }
  `],
  template: `
    @if (loading) {
      <app-loading-spinner message="Loading product..."></app-loading-spinner>
    } @else if (!product) {
      <div class="container py-5 text-center">
        <i class="bi bi-exclamation-triangle fs-1 d-block mb-3" style="color: #64748b;"></i>
        <h2 style="color: #e2e8f0;">Product not found</h2>
        <p style="color: #94a3b8;">The product you're looking for doesn't exist or has been removed.</p>
        <a routerLink="/products" class="btn btn-primary mt-3">Back to Products</a>
      </div>
    } @else {
      <div class="container py-3 py-md-4 px-2 px-sm-3 fade-in">
        <nav class="mb-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a routerLink="/" style="color: #0ea5e9;">Home</a></li>
            <li class="breadcrumb-item"><a routerLink="/products" style="color: #0ea5e9;">Products</a></li>
            @if (product.category_name) {
              <li class="breadcrumb-item">
                <a [routerLink]="['/category', product.category_slug]" style="color: #0ea5e9;">{{ product.category_name }}</a>
              </li>
            }
            <li class="breadcrumb-item active" style="color: #94a3b8;">{{ product.name }}</li>
          </ol>
        </nav>

        <div class="row g-4">
          <div class="col-lg-6">
            <div class="card p-3" style="background: #1e293b; border: 1px solid #334155;">
              <div class="gallery-wrapper position-relative">
                @if (product.discount_percent && product.discount_percent > 0) {
                  <span class="badge badge-discount" style="top: 20px; left: 20px; z-index: 11;">-{{ product.discount_percent }}%</span>
                }
                @if (getAllImages().length > 1) {
                  <button class="gallery-arrow prev" (click)="prevImage()" aria-label="Previous image">
                    <i class="bi bi-chevron-left"></i>
                  </button>
                  <button class="gallery-arrow next" (click)="nextImage()" aria-label="Next image">
                    <i class="bi bi-chevron-right"></i>
                  </button>
                  <span class="gallery-counter">{{ currentImageIndex + 1 }} / {{ getAllImages().length }}</span>
                }
                <img [src]="(selectedImage || product.image || defaultPlaceholder) | imageUrl" [alt]="product.name"
                     class="img-fluid rounded gallery-slide gallery-main-img"
                     [class.is-portrait]="isPortrait"
                     [ngClass]="slideClass"
                     (click)="openLightbox(selectedImage || product.image)"
                     (load)="onMainImageLoad($event)"
                     (error)="onImgError($event)"
                     title="Click to enlarge">
              </div>
              @if (showLightbox) {
                <div class="lightbox-overlay" (click)="closeLightbox()">
                  <button class="lightbox-close" (click)="closeLightbox()" aria-label="Close"><i class="bi bi-x-lg"></i></button>
                  <img [src]="lightboxImage | imageUrl" [alt]="product.name" (click)="$event.stopPropagation()">
                </div>
              }
              @if (getAllImages().length > 1) {
                <div class="d-flex gap-2 mt-3 overflow-auto pb-1">
                  @for (img of getAllImages(); track $index) {
                    <img [src]="img | imageUrl" alt="thumb" class="product-gallery-thumb" [class.active]="selectedImage === img" (click)="selectImage($index)" (error)="onImgError($event)">
                  }
                </div>
              }
            </div>
          </div>

          <div class="col-lg-6">
            <div class="ps-lg-3">
              @if (product.brand) {
                <small style="color: #94a3b8; text-transform: uppercase; font-size: 0.75rem;">{{ product.brand }}</small>
              }
              <h1 class="fw-bold mb-2" style="color: #e2e8f0;">{{ product.name }}</h1>
              <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <div class="stars">
                  @for (i of [1,2,3,4,5]; track i) {
                    <i class="bi" [ngClass]="i <= (product.rating || 0) ? 'bi-star-fill' : 'bi-star'"></i>
                  }
                </div>
                <span class="small" style="color: #94a3b8;">({{ product.reviews_count || 0 }} reviews)</span>
                @if (product.stock > 0) {
                  <span class="badge bg-success">In Stock ({{ product.stock }})</span>
                } @else {
                  <span class="badge bg-danger">Out of Stock</span>
                }
              </div>

              <div class="mb-3">
                <span class="display-5 fw-bold" style="color: #0ea5e9; font-size: clamp(1.5rem, 5vw, 2.5rem);">{{ product.price | number:'1.2-2' }} DT</span>
                @if (product.old_price) {
                  <span class="text-decoration-line-through ms-2" style="color: #64748b; font-size: clamp(0.9rem, 2.5vw, 1.25rem);">{{ product.old_price | number:'1.2-2' }} DT</span>
                }
                @if (product.discount_percent && product.discount_percent > 0) {
                  <span class="badge bg-danger ms-2">Save {{ product.discount_percent }}%</span>
                }
              </div>

              <p style="color: #94a3b8;">{{ product.description }}</p>

              @if (product.stock > 0) {
                <!-- ───────────────────────────────────────────── -->
                <!-- QUANTITY STEPPER — buttons only, no input    -->
                <!-- ───────────────────────────────────────────── -->
                <div class="mb-3">
                  <label class="fw-semibold mb-2 d-block" style="color: #e2e8f0;">Quantity:</label>
                  <div class="d-flex align-items-center gap-3 flex-wrap">
                    <div class="qty-stepper">
                      <button class="qty-btn"
                        (click)="decrease()"
                        [disabled]="quantity <= 1"
                        aria-label="Decrease quantity">&#8722;</button>

                      <span class="qty-value">{{ quantity }}</span>

                      <button class="qty-btn"
                        (click)="increase()"
                        [disabled]="quantity >= product.stock"
                        aria-label="Increase quantity">&#43;</button>
                    </div>

                    @if (product.stock <= 5) {
                      <small class="text-danger fw-semibold">
                        <i class="bi bi-exclamation-triangle"></i> Only {{ product.stock }} left!
                      </small>
                    } @else if (product.stock <= 20) {
                      <small class="text-warning">
                        <i class="bi bi-clock"></i> Limited stock — {{ product.stock }} left
                      </small>
                    } @else {
                      <small class="text-success">
                        <i class="bi bi-check-circle"></i> In stock
                      </small>
                    }
                  </div>
                </div>
                <!-- ───────────────────────────────────────────── -->

                <div class="d-flex gap-2 mb-4">
                  <button class="btn btn-lg flex-grow-1" style="background: #0ea5e9; color: #fff; border: none;" (click)="addToCart()">
                    <i class="bi bi-cart-plus"></i> Add to Cart
                  </button>
                </div>
              } @else {
                <div class="alert mb-4" style="background: #1e293b; border-color: #334155; color: #94a3b8;">
                  <i class="bi bi-info-circle"></i> This product is currently out of stock.
                </div>
              }

              <div class="card p-3" style="background: #1e293b; border-color: #334155;">
                <div class="row text-center small">
                  <div class="col-4">
                    <i class="bi bi-truck fs-4 d-block" style="color: #0ea5e9;"></i>
                    <strong style="color: #e2e8f0;">Free Shipping</strong>
                    <div style="color: #64748b;">On orders 50 DT+</div>
                  </div>
                  <div class="col-4">
                    <i class="bi bi-arrow-counterclockwise fs-4 d-block" style="color: #0ea5e9;"></i>
                    <strong style="color: #e2e8f0;">30-Day Returns</strong>
                    <div style="color: #64748b;">Hassle-free</div>
                  </div>
                  <div class="col-4">
                    <i class="bi bi-shield-check fs-4 d-block" style="color: #0ea5e9;"></i>
                    <strong style="color: #e2e8f0;">Secure Payment</strong>
                    <div style="color: #64748b;">100% protected</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section class="mt-5">
          <h3 class="section-title" style="color: #e2e8f0;">Customer Reviews ({{ reviews.length }})</h3>
          @if (reviews.length === 0) {
            <div class="card p-4 text-center" style="background: #1e293b; border: 1px solid #334155;">
              <i class="bi bi-chat-dots fs-1 d-block mb-2" style="color: #475569;"></i>
              <p class="mt-2 mb-0" style="color: #94a3b8;">No reviews yet. Be the first to review this product!</p>
            </div>
          } @else {
            @for (r of reviews; track r.id) {
              <div class="card p-3 mb-2" style="background: #1e293b; border: 1px solid #334155;">
                <div class="d-flex justify-content-between">
                  <div>
                    <strong style="color: #e2e8f0;">{{ r.display_name || r.user_name || 'Anonyme' }}</strong>
                    @if (r.verified) {
                      <span class="badge ms-2 small" style="background: #10b981; color: #fff;">Verified Purchase</span>
                    }
                    <div class="stars small">
                      @for (i of [1,2,3,4,5]; track i) {
                        <i class="bi" [ngClass]="i <= r.rating ? 'bi-star-fill' : 'bi-star'" [style.color]="i <= r.rating ? '#fbbf24' : '#475569'"></i>
                      }
                    </div>
                  </div>
                  <small style="color: #64748b;">{{ r.created_at | date: 'medium' }}</small>
                </div>
                @if (r.comment) {
                  <p class="mb-0 mt-2" style="color: #cbd5e1;">{{ r.comment }}</p>
                }
              </div>
            }
          }

          <div class="card p-4 mt-3" style="background: #1e293b; border: 1px solid #334155;">
            <h5 class="fw-bold mb-3" style="color: #e2e8f0;">Leave a Review</h5>
            <div class="mb-3">
              <label class="form-label fw-semibold" style="color: #e2e8f0;">Your Name</label>
              <input type="text" class="form-control" [(ngModel)]="reviewerName" placeholder="Enter your name" style="background: #0f172a; border-color: #334155; color: #e2e8f0;" />
            </div>
            <div class="mb-3">
              <label class="fw-semibold mb-2 d-block" style="color: #e2e8f0;">Rating *</label>
              <div class="stars fs-4">
                @for (i of [1,2,3,4,5]; track i) {
                  <i class="bi cursor-pointer" [ngClass]="i <= newRating ? 'bi-star-fill text-warning' : 'bi-star'" (click)="setRating(i)"></i>
                }
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold" style="color: #e2e8f0;">Comment</label>
              <textarea class="form-control" rows="3" [(ngModel)]="newComment" placeholder="Share your experience with this product..." style="background: #0f172a; border-color: #334155; color: #e2e8f0;"></textarea>
            </div>
            <button class="btn" style="background: #0ea5e9; color: #fff; border: none;" (click)="submitReview()" [disabled]="!newRating || submittingReview">
              @if (submittingReview) { <span class="spinner-border spinner-border-sm me-2"></span> }
              Submit Review
            </button>
          </div>
        </section>

        @if (related.length > 0) {
          <section class="mt-5">
            <h3 class="section-title" style="color: #e2e8f0;">Related Products</h3>
            <div class="row g-3">
              @for (p of related; track p.id) {
                <div class="col-6 col-md-3">
                  <app-product-card [product]="p"></app-product-card>
                </div>
              }
            </div>
          </section>
        }
      </div>
    }
  `,
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cart = inject(CartService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  defaultPlaceholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" fill="%236b7280" viewBox="0 0 16 16" style="background:%23f3f4f6;"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>';

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultPlaceholder;
  }

  onMainImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Detect portrait: height > width * 1.1 (allow small tolerance)
    this.isPortrait = img.naturalHeight > img.naturalWidth * 1.1;
    this.cdr.markForCheck();
  }

  openLightbox(img: string | undefined): void {
    if (!img || img === this.defaultPlaceholder) return;
    this.lightboxImage = img;
    this.showLightbox = true;
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  closeLightbox(): void {
    this.showLightbox = false;
    this.lightboxImage = '';
    document.body.style.overflow = '';
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showLightbox) this.closeLightbox();
  }

  private destroy$ = new Subject<void>();

  product: Product | null = null;
  related: Product[] = [];
  reviews: Review[] = [];
  loading = true;
  quantity = 1;
  newRating = 0;
  newComment = '';
  reviewerName = '';
  canReview = false;
  submittingReview = false;
  selectedImage = '';
  slideClass = '';
  currentImageIndex = 0;
  isPortrait = false;
  showLightbox = false;
  lightboxImage = '';

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        this.loading = true;
        this.product = null;
        this.quantity = 1;
        this.cdr.markForCheck();
        return this.api.getProduct(params['slug']);
      })
    ).subscribe({
      next: (res: any) => {
        this.product = res.product;
        this.selectedImage = res.product.image || '';
        this.related = (res.related || []).map((p: any) => ({
          ...p,
          discount_percent: p.old_price ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 0,
        }));
        this.reviews = res.product.reviews || [];
        this.quantity = 1;
        this.checkCanReview();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.product = null;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.body.style.overflow = '';
  }

  /** Decrease quantity — minimum 1 */
  decrease(): void {
    if (this.quantity > 1) {
      this.quantity -= 1;
    }
  }

  /** Increase quantity — capped at available stock */
  increase(): void {
    const stock = this.product?.stock ?? 1;
    if (this.quantity < stock) {
      this.quantity += 1;
    }
  }

  setRating(i: number): void {
    this.newRating = i;
  }

  getAllImages(): string[] {
    if (!this.product) return [];
    const images: string[] = [];
    if (this.product.image) images.push(this.product.image);
    if (this.product.images) {
      const extra = typeof this.product.images === 'string' ? JSON.parse(this.product.images) : this.product.images;
      if (Array.isArray(extra)) {
        extra.forEach((img: string) => { if (img && !images.includes(img)) images.push(img); });
      }
    }
    return images;
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
    this.selectedImage = this.getAllImages()[index] || '';
    this.isPortrait = false;
    this.triggerSlide('');
    this.cdr.markForCheck();
  }

  prevImage(): void {
    const images = this.getAllImages();
    if (images.length <= 1) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + images.length) % images.length;
    this.selectedImage = images[this.currentImageIndex];
    this.isPortrait = false;
    this.triggerSlide('slide-from-left');
    this.cdr.markForCheck();
  }

  nextImage(): void {
    const images = this.getAllImages();
    if (images.length <= 1) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % images.length;
    this.selectedImage = images[this.currentImageIndex];
    this.isPortrait = false;
    this.triggerSlide('slide-from-right');
    this.cdr.markForCheck();
  }

  private triggerSlide(cls: string): void {
    this.slideClass = '';
    this.cdr.markForCheck();
    requestAnimationFrame(() => {
      this.slideClass = cls;
      this.cdr.markForCheck();
    });
  }

  async addToCart(): Promise<void> {
    this.cart.add(this.product!, this.quantity);
    this.cdr.markForCheck();
  }

  async submitReview(): Promise<void> {
    if (!this.newRating) {
      this.toast.warning('Please select a rating');
      return;
    }
    this.submittingReview = true;
    this.cdr.markForCheck();
    try {
      await this.api.addReview({
        product_id: this.product!.id,
        rating: this.newRating,
        comment: this.newComment,
        name: this.reviewerName || 'Anonyme',
      }).toPromise();
      this.newRating = 0;
      this.newComment = '';
      this.reviewerName = '';
      this.toast.success('Review submitted! Thank you.');
      const res: any = await this.api.getProductReviews(this.product!.id).toPromise();
      this.reviews = res.reviews || [];
      this.checkCanReview();
    } catch (err: any) {
      this.toast.error(err.error?.error || 'Failed to submit');
    }
    this.submittingReview = false;
    this.cdr.markForCheck();
  }

  private checkCanReview(): void {
    this.canReview = true;
  }
}
