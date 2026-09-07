import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Product } from '../../core/models';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container py-3 py-md-4 px-2 px-sm-3">
      <div class="mb-3">
        <h2 class="mb-0 fw-bold" style="color: #e2e8f0;">{{ pageTitle }}</h2>
        <small style="color: #64748b;">{{ pagination.total || 0 }} products</small>
      </div>

      @if (loading) {
        <app-loading-spinner message="Loading products..."></app-loading-spinner>
      } @else if (products.length === 0) {
        <div class="empty-state card p-5">
          <i class="bi bi-search" style="color: #475569;"></i>
          <h4 style="color: #e2e8f0;">No products found</h4>
        </div>
      } @else {
        <div class="row g-3">
          @for (p of products; track p.id) {
            <div class="col-6 col-md-4 col-lg-3">
              <app-product-card [product]="p"></app-product-card>
            </div>
          }
        </div>

        @if (pagination.pages && pagination.pages > 1) {
          <nav class="mt-4">
            <ul class="pagination justify-content-center">
              <li class="page-item" [class.disabled]="pagination.page === 1">
                <a class="page-link" (click)="goToPage(pagination.page! - 1)" style="background: #1e293b; border-color: #334155; color: #e2e8f0;"><i class="bi bi-chevron-left"></i></a>
              </li>
              @for (page of pageNumbers; track page) {
                <li class="page-item" [class.active]="page === pagination.page">
                  <a class="page-link" (click)="goToPage(page)" [style]="page === pagination.page ? 'background: #0ea5e9; border-color: #0ea5e9; color: #fff;' : 'background: #1e293b; border-color: #334155; color: #e2e8f0;'">{{ page }}</a>
                </li>
              }
              <li class="page-item" [class.disabled]="pagination.page === pagination.pages">
                <a class="page-link" (click)="goToPage(pagination.page! + 1)" style="background: #1e293b; border-color: #334155; color: #e2e8f0;"><i class="bi bi-chevron-right"></i></a>
              </li>
            </ul>
          </nav>
        }
      }
    </div>
  `,
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  products: Product[] = [];
  loading = true;
  pageTitle = 'All Products';
  pagination: any = { page: 1, limit: 12, total: 0, pages: 0 };
  pageNumbers: number[] = [];
  private currentSearch = '';

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.pageTitle = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
      } else {
        this.pageTitle = 'All Products';
      }
      this.pagination.page = 1;
      this.currentSearch = this.route.snapshot.queryParams['search'] || '';
      this.loadProducts(slug);
    });

    this.route.queryParams.subscribe((qp) => {
      const search = qp['search'] || '';
      if (search !== this.currentSearch) {
        this.currentSearch = search;
        this.pagination.page = 1;
        this.loadProducts(this.route.snapshot.params['slug']);
      }
    });
  }

  async loadProducts(categorySlug?: string): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const params: any = {
        page: this.pagination.page,
        limit: this.pagination.limit,
      };
      if (categorySlug) params.category = categorySlug;
      if (this.currentSearch) params.search = this.currentSearch;
      const res: any = await this.api.getProducts(params).toPromise();
      this.products = res.products || [];
      this.pagination = res.pagination || this.pagination;
      this.pageNumbers = Array.from({ length: this.pagination.pages || 0 }, (_, i) => i + 1);
      if (this.currentSearch) this.pageTitle = `Results for "${this.currentSearch}"`;
    } catch {}
    this.loading = false;
    this.cdr.markForCheck();
  }

  goToPage(page: number): void {
    if (page < 1 || page > (this.pagination.pages || 1)) return;
    this.pagination.page = page;
    this.loadProducts(this.route.snapshot.params['slug']);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
