import { Component, inject, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Product, Category } from '../../core/models';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, LoadingSpinnerComponent, ImageUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hero Photo with Parallax -->
    <section class="hero-parallax" #heroSection>
      <div class="hero-parallax-bg" #parallaxBg></div>
      <div class="hero-overlay"></div>
    </section>

    <!-- Welcome Text -->
    <section class="welcome-section py-4 py-md-5" style="background: #0f172a;">
      <div class="container text-center px-3" style="max-width: 700px;">
        <span class="badge mb-3 px-3 py-2" style="background: #0ea5e9; color: #fff; font-size: 0.8rem;">New Collection 2026</span>
        <h1 class="fw-bold mb-3 text-white" style="font-size: clamp(1.5rem, 4vw, 2.8rem); line-height: 1.2;">Discover Your<br>Next Favorite Thing</h1>
        <p class="mb-4 px-2" style="color: #94a3b8; font-size: clamp(0.9rem, 2vw, 1.1rem);">Shop thousands of products from top brands. Fast shipping, easy returns, unbeatable prices.</p>
        <div class="d-flex gap-2 flex-wrap justify-content-center">
          <a routerLink="/products" class="btn btn-lg fw-semibold" style="background: #0ea5e9; color: #fff; border: none;">
            <i class="bi bi-grid"></i> Shop Now
          </a>
          <a routerLink="/products" [queryParams]="{featured: 'true'}" class="btn btn-outline-light btn-lg">
            <i class="bi bi-star"></i> Featured
          </a>
        </div>
        <div class="d-flex gap-3 gap-md-4 mt-4 flex-wrap justify-content-center">
          <div>
            <h3 class="fw-bold mb-0" style="color: #0ea5e9;">10K+</h3>
            <small style="color: #94a3b8;">Products</small>
          </div>
          <div>
            <h3 class="fw-bold mb-0" style="color: #0ea5e9;">50K+</h3>
            <small style="color: #94a3b8;">Happy Customers</small>
          </div>
          <div>
            <h3 class="fw-bold mb-0" style="color: #0ea5e9;">4.9&#9733;</h3>
            <small style="color: #94a3b8;">Average Rating</small>
          </div>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="py-4 py-md-5" style="background: #0f172a;">
      <div class="container px-2 px-sm-3">
        <div class="d-flex justify-content-between align-items-end mb-3 mb-md-4">
          <h2 class="section-title mb-0" style="font-size: clamp(1.1rem, 3vw, 1.5rem);">Shop by Category</h2>
          <a routerLink="/products" class="text-decoration-none small d-none d-sm-inline" style="color: #0ea5e9;">View all <i class="bi bi-arrow-right"></i></a>
        </div>
        @if (loadingCats) {
          <app-loading-spinner message="Loading categories..."></app-loading-spinner>
        } @else {
          <div class="row g-2 g-md-3">
            @for (cat of categories; track cat.id) {
              <div class="col-4 col-md-4 col-lg-3">
                <a [routerLink]="['/category', cat.slug]" class="text-decoration-none">
                  <div class="card text-center h-100 cursor-pointer p-2 p-md-3">
                    <div class="rounded-circle mx-auto d-flex align-items-center justify-content-center mb-2 overflow-hidden"
                         style="width: 50px; height: 50px; background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; font-size: 1.3rem;">
                      @if (cat.image) {
                        <img [src]="cat.image | imageUrl" [alt]="cat.name" style="width: 100%; height: 100%; object-fit: cover;" />
                      } @else {
                        <i class="bi" [ngClass]="cat.icon || 'bi-tag'"></i>
                      }
                    </div>
                    <h6 class="mb-0 text-white" style="font-size: clamp(0.7rem, 2vw, 0.9rem);">{{ cat.name }}</h6>
                    <small style="color: #94a3b8; font-size: 0.7rem;">{{ cat.product_count || 0 }} items</small>
                  </div>
                </a>
              </div>
            }
          </div>
        }
      </div>
    </section>

    <!-- All Products -->
    <section class="py-4 py-md-5" style="background: #020617;">
      <div class="container px-2 px-sm-3">
        <div class="d-flex justify-content-between align-items-end mb-3 mb-md-4">
          <h2 class="section-title mb-0" style="font-size: clamp(1.1rem, 3vw, 1.5rem);">All Products</h2>
          <a routerLink="/products" class="text-decoration-none small d-none d-sm-inline" style="color: #0ea5e9;">View all <i class="bi bi-arrow-right"></i></a>
        </div>
        @if (loadingAll) {
          <app-loading-spinner message="Loading products..."></app-loading-spinner>
        } @else {
          <div class="row g-2 g-md-3">
            @for (p of allProducts; track p.id) {
              <div class="col-6 col-md-4 col-lg-3">
                <app-product-card [product]="p"></app-product-card>
              </div>
            }
          </div>
        }
      </div>
    </section>

    <!-- New arrivals -->
    <section class="py-4 py-md-5" style="background: #020617;">
      <div class="container px-2 px-sm-3">
        <div class="d-flex justify-content-between align-items-end mb-3 mb-md-4">
          <h2 class="section-title mb-0" style="font-size: clamp(1.1rem, 3vw, 1.5rem);">New Arrivals</h2>
          <a routerLink="/products" class="text-decoration-none small d-none d-sm-inline" style="color: #0ea5e9;">View all <i class="bi bi-arrow-right"></i></a>
        </div>
        @if (loadingNew) {
          <app-loading-spinner message="Loading..."></app-loading-spinner>
        } @else {
          <div class="row g-2 g-md-3">
            @for (p of newest; track p.id) {
              <div class="col-6 col-md-4 col-lg-3">
                <app-product-card [product]="p"></app-product-card>
              </div>
            }
          </div>
        }
      </div>
    </section>

    <!-- Why us -->
    <section class="py-4 py-md-5" style="background: #0f172a;">
      <div class="container px-2 px-sm-3">
        <h2 class="section-title text-center mx-auto mb-4 mb-md-5" style="max-width: 400px; font-size: clamp(1.1rem, 3vw, 1.5rem);">Why Shop With Us</h2>
        <div class="row g-3 g-md-4 text-center">
          <div class="col-6 col-md-3">
            <div class="mb-2"><i class="bi bi-truck fs-3" style="color: #0ea5e9;"></i></div>
            <h6 class="fw-bold text-white mb-1" style="font-size: clamp(0.8rem, 2vw, 1rem);">Free Shipping</h6>
            <small style="color: #94a3b8; font-size: 0.75rem;">On orders over 50 DT</small>
          </div>
          <div class="col-6 col-md-3">
            <div class="mb-2"><i class="bi bi-shield-check fs-3" style="color: #0ea5e9;"></i></div>
            <h6 class="fw-bold text-white mb-1" style="font-size: clamp(0.8rem, 2vw, 1rem);">Secure Payment</h6>
            <small style="color: #94a3b8; font-size: 0.75rem;">100% protected</small>
          </div>
          <div class="col-6 col-md-3">
            <div class="mb-2"><i class="bi bi-arrow-counterclockwise fs-3" style="color: #0ea5e9;"></i></div>
            <h6 class="fw-bold text-white mb-1" style="font-size: clamp(0.8rem, 2vw, 1rem);">Easy Returns</h6>
            <small style="color: #94a3b8; font-size: 0.75rem;">30-day return policy</small>
          </div>
          <div class="col-6 col-md-3">
            <div class="mb-2"><i class="bi bi-headset fs-3" style="color: #0ea5e9;"></i></div>
            <h6 class="fw-bold text-white mb-1" style="font-size: clamp(0.8rem, 2vw, 1rem);">24/7 Support</h6>
            <small style="color: #94a3b8; font-size: 0.75rem;">Always here to help</small>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroSection') heroSection!: ElementRef<HTMLElement>;
  @ViewChild('parallaxBg') parallaxBg!: ElementRef<HTMLElement>;

  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private scrollHandler = this.onScroll.bind(this);
  private rafId = 0;

  categories: Category[] = [];
  allProducts: Product[] = [];
  newest: Product[] = [];
  loadingCats = true;
  loadingAll = true;
  loadingNew = true;

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    this.onScroll();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  onScroll(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      if (window.innerWidth <= 768) return;
      const bg = this.parallaxBg?.nativeElement;
      const hero = this.heroSection?.nativeElement;
      if (!bg || !hero) return;

      const scrollY = window.pageYOffset;
      const heroRect = hero.getBoundingClientRect();
      const heroTop = heroRect.top + scrollY;
      const heroHeight = hero.offsetHeight;

      if (scrollY + window.innerHeight < heroTop || scrollY > heroTop + heroHeight) return;

      const progress = (scrollY - heroTop) / heroHeight;
      const maxShift = 60;
      const translateY = progress * maxShift;
      bg.style.transform = `translate3d(0, ${translateY}px, 0)`;
    });
  }

  private async loadData(): Promise<void> {
    try {
      const cats: any = await this.api.getCategories().toPromise();
      this.categories = cats.categories || [];
    } catch {}
    this.loadingCats = false;
    this.cdr.markForCheck();

    try {
      const res: any = await this.api.getProducts({ limit: 100 }).toPromise();
      this.allProducts = res.products || [];
    } catch {}
    this.loadingAll = false;
    this.cdr.markForCheck();

    try {
      const res: any = await this.api.getProducts({ sort: 'newest', limit: 8 }).toPromise();
      this.newest = res.products || [];
    } catch {}
    this.loadingNew = false;
    this.cdr.markForCheck();
  }
}
