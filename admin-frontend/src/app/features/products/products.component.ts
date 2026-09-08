import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

const FALLBACK_IMG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDgwIDgwIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiNlMmU4ZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5NDBkODAiPjgwIHg4MDwvdGV4dD48L3N2Zz4=';

interface Product {
  id: number;
  name: string;
  brand: string;
  description: string;
  price: number;
  old_price: number | null;
  stock: number;
  image: string;
  images: string[] | string;
  featured: number;
  active: number;
  category_id: number | null;
  category_name: string | null;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
}

interface PaginatedResponse {
  products: Product[];
  pagination: { total: number; page: number; pages: number; limit: number };
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, ImageUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="products-page px-2 px-sm-3">
      <!-- Header -->
      <div class="page-header d-flex justify-content-between align-items-center mb-3 mb-md-4">
        <div>
          <h2 class="mb-0" style="font-size: clamp(1rem, 3vw, 1.5rem);">Products</h2>
          <small class="d-none d-sm-inline" [style.color]="'var(--text-muted)'">{{ totalCount() }} total</small>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm" (click)="openAiModal()">
            <i class="bi bi-robot me-1"></i> <span class="d-none d-sm-inline">AI Upload</span><span class="d-sm-none">AI</span>
          </button>
          <button class="btn btn-primary btn-sm" (click)="openAddModal()">
            <i class="bi bi-plus-lg me-1"></i> <span class="d-none d-sm-inline">Add Product</span><span class="d-sm-none">Add</span>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="card mb-3 mb-md-4">
        <div class="card-body p-2 p-md-3">
          <div class="row g-2">
            <div class="col-12 col-md-4">
              <div class="input-group input-group-sm">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input
                  type="text"
                  class="form-control"
                  placeholder="Search products..."
                  [ngModel]="searchQuery()"
                  (ngModelChange)="onSearchChange($event)"
                />
              </div>
            </div>
            <div class="col-6 col-md-3">
              <select class="form-select form-select-sm" [ngModel]="selectedCategory()" (ngModelChange)="onCategoryChange($event)">
                <option value="">All Categories</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>
            <div class="col-6 col-md-3">
              <select class="form-select form-select-sm" [ngModel]="selectedStock()" (ngModelChange)="onStockChange($event)">
                <option value="">All Stock</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
            <div class="col-12 col-md-2 d-flex gap-2">
              <button class="btn btn-outline-secondary btn-sm flex-fill" (click)="resetFilters()">
                <i class="bi bi-x-lg me-1"></i> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Actions -->
      @if (selectedIds().length > 0) {
        <div class="alert alert-info d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <span class="small">{{ selectedIds().length }} selected</span>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-warning" (click)="bulkToggleFeatured()">
              <i class="bi bi-star me-1"></i> <span class="d-none d-sm-inline">Featured</span><span class="d-sm-none">Star</span>
            </button>
            <button class="btn btn-sm btn-outline-danger" (click)="bulkDelete()">
              <i class="bi bi-trash me-1"></i> <span class="d-none d-sm-inline">Delete</span>
            </button>
          </div>
        </div>
      }

      @if (loading()) {
        <app-loading-spinner message="Loading products..."></app-loading-spinner>
      }

      @if (!loading()) {
        <div class="card">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead>
                <tr>
                  <th style="width:40px">
                    <input type="checkbox" class="form-check-input" [checked]="allSelected()" (change)="toggleSelectAll($event)" />
                  </th>
                  <th style="width:60px">Image</th>
                  <th>Name</th>
                  <th class="d-mobile-none">Category</th>
                  <th>Price</th>
                  <th class="d-mobile-none">Stock</th>
                  <th class="d-mobile-none text-center" style="width:70px">Featured</th>
                  <th style="width:60px">Active</th>
                  <th style="width:70px">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (product of products(); track product.id) {
                  <tr>
                    <td>
                      <input type="checkbox" class="form-check-input" [checked]="selectedIds().includes(product.id)" (change)="toggleSelect(product.id)" />
                    </td>
                    <td>
                      <img [src]="(product.image || FALLBACK_IMG) | imageUrl" [alt]="product.name" class="rounded" width="40" height="40" style="object-fit: cover;" (error)="onImageError($event)" />
                    </td>
                    <td>
                      <div class="fw-semibold" [style.color]="'var(--text-primary)'" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ product.name }}</div>
                      <small [style.color]="'var(--text-muted)'">{{ product.brand }}</small>
                    </td>
                    <td class="d-mobile-none" [style.color]="'var(--text-secondary)'">{{ product.category_name || '—' }}</td>
                    <td>
                      <span class="fw-semibold" [style.color]="'var(--primary)'">{{ product.price | number:'1.2-2' }} DT</span>
                    </td>
                    <td class="d-mobile-none">
                      <span class="badge" [class.bg-success]="product.stock > 10" [class.bg-warning]="product.stock >= 1 && product.stock <= 10" [class.bg-danger]="product.stock === 0">
                        {{ product.stock === 0 ? 'Out' : product.stock }}
                      </span>
                    </td>
                    <td class="d-mobile-none text-center">
                      <button class="btn btn-sm p-0 border-0 bg-transparent" (click)="toggleFeatured(product)">
                        <i class="bi fs-5" [class.bi-star-fill]="product.featured" [class.text-warning]="product.featured" [class.bi-star]="!product.featured" [class.text-muted]="!product.featured"></i>
                      </button>
                    </td>
                    <td class="text-center">
                      <div class="form-check form-switch d-inline-block">
                        <input class="form-check-input" type="checkbox" role="switch" [checked]="product.active" (change)="toggleActive(product)" />
                      </div>
                    </td>
                    <td>
                      <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-outline-primary" (click)="openEditModal(product)" title="Edit">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" (click)="confirmDelete(product)" title="Delete">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="text-center py-5" [style.color]="'var(--text-muted)'">
                      <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                      No products found.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (totalPages() > 1) {
          <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
            <small [style.color]="'var(--text-muted)'">
              {{ (currentPage() - 1) * pageSize() + 1 }}–{{ Math.min(currentPage() * pageSize(), totalCount()) }}
              of {{ totalCount() }}
            </small>
            <nav>
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" [class.disabled]="currentPage() === 1">
                  <button class="page-link" (click)="goToPage(currentPage() - 1)">Prev</button>
                </li>
                @for (p of visiblePages(); track p) {
                  <li class="page-item" [class.active]="p === currentPage()">
                    <button class="page-link" (click)="goToPage(p)">{{ p }}</button>
                  </li>
                }
                <li class="page-item" [class.disabled]="currentPage() === totalPages()">
                  <button class="page-link" (click)="goToPage(currentPage() + 1)">Next</button>
                </li>
              </ul>
            </nav>
          </div>
        }
      }

      <!-- Modal: Add / Edit -->
      @if (showModal()) {
        <div class="modal-backdrop fade show" (click)="closeModal()"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-xl modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold">
                  <i class="bi" [class.bi-plus-circle]="!editingProduct()" [class.bi-pencil-square]="editingProduct()"></i>
                  {{ editingProduct() ? 'Edit Product' : 'Add New Product' }}
                </h5>
                <button type="button" class="btn-close btn-close-white" (click)="closeModal()"></button>
              </div>
              <div class="modal-body p-4">
                <form #productForm="ngForm" (ngSubmit)="saveProduct()">
                  <!-- Basic Info -->
                  <div class="form-section mb-4">
                    <h6 class="form-section-title"><i class="bi bi-info-circle me-1"></i> Basic Information</h6>
                    <div class="row g-3">
                      <div class="col-md-8">
                        <label class="form-label">Product Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control form-control-lg" name="name" placeholder="Enter product name" [(ngModel)]="formData.name" required #nameField="ngModel" />
                        @if (nameField.invalid && nameField.touched) {
                          <div class="text-danger small mt-1"><i class="bi bi-exclamation-circle me-1"></i>Name is required.</div>
                        }
                      </div>
                      <div class="col-md-4">
                        <label class="form-label">Brand</label>
                        <input type="text" class="form-control" name="brand" placeholder="e.g. Samsung, Apple" [(ngModel)]="formData.brand" />
                      </div>
                      <div class="col-12">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" name="description" rows="3" placeholder="Describe the product..." [(ngModel)]="formData.description"></textarea>
                      </div>
                    </div>
                  </div>

                  <!-- Pricing & Stock -->
                  <div class="form-section mb-4">
                    <h6 class="form-section-title"><i class="bi bi-tag me-1"></i> Pricing & Stock</h6>
                    <div class="row g-3">
                      <div class="col-md-4">
                        <label class="form-label">Price <span class="text-danger">*</span></label>
                        <div class="input-group">
                          <span class="input-group-text">DT</span>
                          <input type="number" class="form-control" name="price" placeholder="0.00" [(ngModel)]="formData.price" required min="0" step="0.01" #priceField="ngModel" />
                        </div>
                        @if (priceField.invalid && priceField.touched) {
                          <div class="text-danger small mt-1"><i class="bi bi-exclamation-circle me-1"></i>Price is required.</div>
                        }
                      </div>
                      <div class="col-md-4">
                        <label class="form-label">Old Price</label>
                        <div class="input-group">
                          <span class="input-group-text">DT</span>
                          <input type="number" class="form-control" name="old_price" placeholder="0.00" [(ngModel)]="formData.old_price" min="0" step="0.01" />
                        </div>
                      </div>
                      <div class="col-md-4">
                        <label class="form-label">Stock <span class="text-danger">*</span></label>
                        <input type="number" class="form-control" name="stock" placeholder="0" [(ngModel)]="formData.stock" required min="0" #stockField="ngModel" />
                        @if (stockField.invalid && stockField.touched) {
                          <div class="text-danger small mt-1"><i class="bi bi-exclamation-circle me-1"></i>Stock is required.</div>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Category & Image -->
                  <div class="form-section mb-4">
                    <h6 class="form-section-title"><i class="bi bi-folder me-1"></i> Category & Image</h6>
                    <div class="row g-3">
                      <div class="col-md-5">
                        <label class="form-label">Category</label>
                        <select class="form-select" name="category_id" [(ngModel)]="formData.category_id">
                          <option [ngValue]="null">Select a category</option>
                          @for (cat of categories(); track cat.id) {
                            <option [value]="cat.id">{{ cat.name }}</option>
                          }
                        </select>
                      </div>
                      <div class="col-md-7">
                        <label class="form-label">Product Images</label>
                        <div class="image-upload-area" (click)="fileInput.click()">
                          <input type="file" class="d-none" name="image" accept="image/*" multiple (change)="onFileSelected($event)" #fileInput />
                          @if (uploadingImage()) {
                            <div class="text-center py-3">
                              <div class="spinner-border mb-2" role="status" [style.color]="'var(--primary)'"></div>
                              <p class="small mb-0" [style.color]="'var(--text-muted)'">Uploading...</p>
                            </div>
                          } @else {
                            <div class="text-center py-3">
                              <i class="bi bi-cloud-arrow-up fs-1" [style.color]="'var(--text-muted)'"></i>
                              <p class="small mb-0 mt-1" [style.color]="'var(--text-muted)'">Click to upload images</p>
                              <small [style.color]="'var(--text-muted)'">JPG, PNG or WEBP — select multiple files</small>
                            </div>
                          }
                        </div>
                        @if (formData.images.length > 0 || formData.image) {
                          <div class="image-grid mt-2">
                            @if (formData.image) {
                              <div class="image-thumb-wrapper">
                                <img [src]="formData.image | imageUrl" alt="Main" class="image-thumb" (error)="onImageError($event)" />
                                <span class="main-badge">Main</span>
                              </div>
                            }
                            @for (img of formData.images; track img; let i = $index) {
                              <div class="image-thumb-wrapper">
                                <img [src]="img | imageUrl" alt="Gallery" class="image-thumb" (error)="onImageError($event)" />
                                <button type="button" class="image-remove-btn" (click)="removeGalleryImage(i); $event.stopPropagation()">
                                  <i class="bi bi-x-lg"></i>
                                </button>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Status -->
                  <div class="form-section">
                    <h6 class="form-section-title"><i class="bi bi-toggle-on me-1"></i> Status</h6>
                    <div class="row g-3">
                      <div class="col-auto">
                        <div class="form-check form-switch">
                          <input class="form-check-input" type="checkbox" role="switch" id="featuredCheck" [(ngModel)]="formData.featured" name="featured" />
                          <label class="form-check-label" for="featuredCheck">Featured Product</label>
                        </div>
                      </div>
                      <div class="col-auto">
                        <div class="form-check form-switch">
                          <input class="form-check-input" type="checkbox" role="switch" id="activeCheck" [(ngModel)]="formData.active" name="active" />
                          <label class="form-check-label" for="activeCheck">Active (Visible on Store)</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <div class="modal-footer" [style.background]="'var(--bg-surface)'">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">
                  <i class="bi bi-x-lg me-1"></i> Cancel
                </button>
                <button type="button" class="btn btn-primary px-4" [disabled]="productForm.invalid || saving()" (click)="saveProduct()">
                  @if (saving()) {
                    <span class="spinner-border spinner-border-sm me-1"></span>
                  }
                  <i class="bi" [class.bi-check-lg]="editingProduct()" [class.bi-plus-lg]="!editingProduct()"></i>
                  {{ editingProduct() ? 'Update Product' : 'Create Product' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="modal-backdrop fade show" (click)="cancelDelete()"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header border-0">
                <h5 class="modal-title text-danger">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>Confirm Delete
                </h5>
                <button type="button" class="btn-close" (click)="cancelDelete()"></button>
              </div>
              <div class="modal-body">
                <p class="mb-0">
                  Are you sure you want to delete
                  <strong>"{{ deletingProduct()?.name }}"</strong>?
                  This action cannot be undone.
                </p>
              </div>
              <div class="modal-footer border-0">
                <button type="button" class="btn btn-secondary" (click)="cancelDelete()">Cancel</button>
                <button
                  type="button"
                  class="btn btn-danger"
                  [disabled]="deleting()"
                  (click)="deleteProduct()"
                >
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

      <!-- AI Upload Modal -->
      @if (showAiModal()) {
        <div class="modal-backdrop fade show" (click)="closeAiModal()"></div>
        <div class="modal fade show d-block" tabindex="-1">
          <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header bg-success text-white">
                <h5 class="modal-title fw-bold">
                  <i class="bi bi-robot me-2"></i>AI Product Upload
                </h5>
                <button type="button" class="btn-close btn-close-white" (click)="closeAiModal()"></button>
              </div>
              <div class="modal-body p-4">
                <!-- Step 1: Upload -->
                @if (aiStep() === 'upload') {
                  <div class="text-center mb-4">
                    <h6 class="fw-semibold" [style.color]="'var(--text-primary)'">Upload Product Photos or Invoice</h6>
                    <p class="small" [style.color]="'var(--text-muted)'">
                      The AI will automatically extract product names, prices, descriptions, and more.
                    </p>
                  </div>
                  <div
                    class="ai-upload-zone"
                    [class.drag-over]="aiDragOver()"
                    (click)="aiFileInput.click()"
                    (dragover)="onAiDragOver($event)"
                    (dragleave)="onAiDragLeave($event)"
                    (drop)="onAiDrop($event)"
                  >
                    <input
                      type="file"
                      class="d-none"
                      #aiFileInput
                      accept="image/*"
                      multiple
                      (change)="onAiFilesSelected($event)"
                    />
                    @if (aiAnalyzing()) {
                      <div class="text-center py-4">
                        <div class="spinner-border mb-3" role="status" style="color: var(--success); width: 3rem; height: 3rem;"></div>
                        <h6 class="fw-semibold" [style.color]="'var(--text-primary)'">Analyzing images with AI...</h6>
                        <p class="small mb-0" [style.color]="'var(--text-muted)'">This may take a few seconds</p>
                      </div>
                    } @else {
                      <div class="text-center py-4">
                        <i class="bi bi-cloud-arrow-up fs-1 mb-2" [style.color]="'var(--text-muted)'"></i>
                        <h6 class="fw-semibold" [style.color]="'var(--text-primary)'">
                          {{ aiDragOver() ? 'Drop images here' : 'Click or drag images here' }}
                        </h6>
                        <p class="small mb-1" [style.color]="'var(--text-muted)'">
                          Product photos, invoices, or factures
                        </p>
                         <small [style.color]="'var(--text-muted)'">JPG, PNG, WEBP — up to 5 images</small>
                      </div>
                    }
                  </div>
                  @if (aiError()) {
                    <div class="alert alert-danger mt-3 mb-0">
                      <i class="bi bi-exclamation-triangle me-1"></i> {{ aiError() }}
                    </div>
                  }
                  @if (aiSelectedFiles().length > 0 && !aiAnalyzing()) {
                    <div class="mt-3">
                      <small class="fw-semibold" [style.color]="'var(--text-muted)'">Selected files:</small>
                      <div class="d-flex flex-wrap gap-2 mt-1">
                        @for (file of aiSelectedFiles(); track file.name; let i = $index) {
                          <div class="badge bg-light text-dark d-flex align-items-center gap-1 px-2 py-1">
                            <i class="bi bi-file-image"></i>
                            <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ file.name }}</span>
                            <button type="button" class="btn-close btn-close-sm" style="font-size: 0.55rem;" (click)="removeAiFile(i); $event.stopPropagation()"></button>
                          </div>
                        }
                      </div>
                    </div>
                  }
                }

                <!-- Step 2: Review extracted products -->
                @if (aiStep() === 'review') {
                  <div class="mb-3">
                    <h6 class="fw-semibold" [style.color]="'var(--text-primary)'">
                      <i class="bi bi-check-circle-fill text-success me-2"></i>
                      {{ aiExtractedProducts().length }} product(s) extracted
                    </h6>
                    <p class="small mb-0" [style.color]="'var(--text-muted)'">
                      Review and edit the data below, then click "Save All Products" to add them to your store.
                    </p>
                  </div>

                  @if (aiWarnings().length > 0) {
                    <div class="alert alert-warning mb-3">
                      <i class="bi bi-exclamation-triangle me-1"></i>
                      <strong>{{ aiWarnings().length }} image(s) failed to analyze:</strong>
                      <ul class="mb-0 mt-1">
                        @for (warning of aiWarnings(); track warning) {
                          <li class="small">{{ warning }}</li>
                        }
                      </ul>
                    </div>
                  }

                  @for (product of aiExtractedProducts(); track product.name; let i = $index) {
                    <div class="ai-product-card mb-3 p-3">
                      <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="fw-bold mb-0" [style.color]="'var(--primary)'">Product {{ i + 1 }}</h6>
                        <button class="btn btn-sm btn-outline-danger" (click)="removeAiProduct(i)">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                      <div class="row g-2">
                        <div class="col-md-8">
                          <label class="form-label small">Name</label>
                          <input type="text" class="form-control form-control-sm" [(ngModel)]="product.name" />
                        </div>
                        <div class="col-md-4">
                          <label class="form-label small">Brand</label>
                          <input type="text" class="form-control form-control-sm" [(ngModel)]="product.brand" />
                        </div>
                        <div class="col-12">
                          <label class="form-label small">Description</label>
                          <textarea class="form-control form-control-sm" rows="2" [(ngModel)]="product.description"></textarea>
                        </div>
                        <div class="col-md-3">
                          <label class="form-label small">Price</label>
                          <div class="input-group input-group-sm">
                            <span class="input-group-text">DT</span>
                            <input type="number" class="form-control" [(ngModel)]="product.price" min="0" step="0.01" />
                          </div>
                        </div>
                        <div class="col-md-3">
                          <label class="form-label small">Old Price</label>
                          <div class="input-group input-group-sm">
                            <span class="input-group-text">DT</span>
                            <input type="number" class="form-control" [(ngModel)]="product.old_price" min="0" step="0.01" />
                          </div>
                        </div>
                        <div class="col-md-3">
                          <label class="form-label small">Stock</label>
                          <input type="number" class="form-control form-control-sm" [(ngModel)]="product.stock" min="0" />
                        </div>
                        <div class="col-md-3">
                          <label class="form-label small">Category</label>
                          <select class="form-select form-select-sm" [(ngModel)]="product.category_id">
                            <option [ngValue]="null">None</option>
                            @for (cat of aiCategories(); track cat.id) {
                              <option [value]="cat.id">{{ cat.name }}</option>
                            }
                          </select>
                        </div>
                      </div>
                    </div>
                  }

                  @if (aiExtractedProducts().length === 0) {
                    <div class="text-center py-4" [style.color]="'var(--text-muted)'">
                      <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                      No products extracted. Try uploading different images.
                    </div>
                  }
                }
              </div>
              <div class="modal-footer" [style.background]="'var(--bg-surface)'">
                @if (aiStep() === 'upload') {
                  <button type="button" class="btn btn-secondary" (click)="closeAiModal()">
                    <i class="bi bi-x-lg me-1"></i> Cancel
                  </button>
                  <button
                    type="button"
                    class="btn btn-success px-4"
                    [disabled]="aiSelectedFiles().length === 0 || aiAnalyzing()"
                    (click)="analyzeAiImages()"
                  >
                    @if (aiAnalyzing()) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    }
                    <i class="bi bi-robot me-1"></i> Analyze with AI
                  </button>
                }
                @if (aiStep() === 'review') {
                  <button type="button" class="btn btn-secondary" (click)="aiStep.set('upload')">
                    <i class="bi bi-arrow-left me-1"></i> Back
                  </button>
                  <button
                    type="button"
                    class="btn btn-success px-4"
                    [disabled]="aiExtractedProducts().length === 0 || aiSaving()"
                    (click)="saveAiProducts()"
                  >
                    @if (aiSaving()) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    }
                    <i class="bi bi-check-lg me-1"></i> Save All Products
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .products-page h2 { color: var(--text-primary); }
    .products-page .card { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); }
    .products-page .card-body { color: var(--text-primary); }
    .product-thumb { border: 1px solid var(--border-color); }
    .form-switch .form-check-input { cursor: pointer; }
    .modal.show { background-color: rgba(0, 0, 0, 0.5); }
    .table { color: var(--text-primary); background: var(--bg-surface); margin-bottom: 0; }
    .table td { vertical-align: middle; color: var(--text-primary); border-color: var(--border-color); background: var(--bg-table-row); padding: 0.5rem; }
    .table th { color: var(--text-muted); border-color: var(--border-color); background: var(--bg-table-head); padding: 0.5rem; white-space: nowrap; }
    .table-hover tbody tr:hover { background-color: var(--bg-table-hover) !important; }
    .form-section { background: var(--bg-surface-alt); border-radius: 12px; padding: 1.25rem; border: 1px solid var(--border-color); }
    .form-section-title { font-weight: 600; color: var(--primary); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--border-color); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.03em; }
    .image-upload-area { border: 2px dashed var(--border-color); border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s ease; min-height: 100px; display: flex; align-items: center; justify-content: center; background: var(--bg-surface-alt); }
    .image-upload-area:hover { border-color: var(--primary); background: rgba(14, 165, 233, 0.05); }
    .image-grid { display: flex; gap: 8px; flex-wrap: wrap; }
    .image-thumb-wrapper { position: relative; width: 72px; height: 72px; border-radius: 8px; overflow: hidden; border: 2px solid var(--border-color); }
    .image-thumb { width: 100%; height: 100%; object-fit: cover; }
    .main-badge { position: absolute; bottom: 2px; left: 2px; font-size: 0.55rem; background: var(--primary); color: #fff; padding: 1px 4px; border-radius: 4px; }
    .image-remove-btn { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0; font-size: 0.6rem; background: var(--danger); color: #fff; border: none; cursor: pointer; }
    .modal-header.bg-primary { background: var(--primary) !important; border-radius: 16px 16px 0 0; }
    .modal-header.bg-success { background: var(--success) !important; border-radius: 16px 16px 0 0; }
    .modal-header { background: var(--bg-surface); color: var(--text-primary); }
    .input-group-text { background: var(--bg-surface-alt); border-color: var(--border-color); color: var(--text-muted); }
    .btn-outline-secondary { color: var(--text-muted); border-color: var(--border-color); }
    .btn-outline-secondary:hover { background: var(--border-color); color: var(--text-primary); border-color: var(--border-color); }
    .ai-upload-zone { border: 2px dashed var(--border-color); border-radius: 12px; cursor: pointer; transition: all 0.2s ease; background: var(--bg-surface-alt); }
    .ai-upload-zone:hover, .ai-upload-zone.drag-over { border-color: var(--success); background: rgba(25, 135, 84, 0.05); }
    .ai-product-card { background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: 12px; }

    @media (max-width: 767.98px) {
      .page-header {
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .page-header h2 { font-size: 1rem; }
      .table td, .table th { padding: 0.4rem 0.35rem; font-size: 0.78rem; }
      .form-check-input { width: 1.1em; height: 1.1em; }
      .form-switch .form-check-input { width: 2em; height: 1em; }
      .pagination { gap: 2px; }
      .page-link { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
      .modal-body { padding: 0.75rem; }
      .form-section { padding: 0.6rem; }
      .form-section-title { font-size: 0.78rem; }
      .image-thumb-wrapper { width: 56px; height: 56px; }
    }
    @media (max-width: 576px) {
      .page-header { flex-wrap: wrap; gap: 0.4rem !important; }
      .page-header h2 { font-size: 0.95rem !important; }
      .table td, .table th { padding: 0.35rem 0.3rem; font-size: 0.75rem; }
      .btn { padding: 0.3rem 0.5rem; font-size: 0.78rem; min-height: 32px; }
      .form-control, .form-select { padding: 0.35rem 0.5rem; font-size: 0.82rem; }
      .card-body { padding: 0.5rem !important; }
      .card-header { padding: 0.4rem 0.5rem !important; }
    }
  `]
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  readonly FALLBACK_IMG = FALLBACK_IMG;
  readonly Math = Math;

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);
  uploadingImage = signal(false);

  searchQuery = signal('');
  selectedCategory = signal('');
  selectedStock = signal('');
  currentPage = signal(1);
  pageSize = signal(20);
  totalCount = signal(0);

  selectedIds = signal<number[]>([]);

  showModal = signal(false);
  editingProduct = signal<Product | null>(null);
  uploadedImageUrl = signal<string | null>(null);

  showDeleteModal = signal(false);
  deletingProduct = signal<Product | null>(null);

  // AI Upload state
  showAiModal = signal(false);
  aiStep = signal<'upload' | 'review'>('upload');
  aiSelectedFiles = signal<File[]>([]);
  aiDragOver = signal(false);
  aiAnalyzing = signal(false);
  aiSaving = signal(false);
  aiError = signal('');
  aiWarnings = signal<string[]>([]);
  aiExtractedProducts = signal<any[]>([]);
  aiCategories = signal<Category[]>([]);

  formData = {
    name: '',
    brand: '',
    description: '',
    price: 0,
    old_price: null as number | null,
    stock: 0,
    category_id: null as number | null,
    image: '',
    images: [] as string[],
    featured: 0,
    active: 1,
  };

  totalPages = computed(() => {
    const total = this.totalCount();
    const size = this.pageSize();
    return Math.ceil(total / size) || 1;
  });

  allSelected = computed(() => {
    const products = this.products();
    const ids = this.selectedIds();
    return products.length > 0 && products.every(p => ids.includes(p.id));
  });

  visiblePages = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  private searchEffect = effect(() => {
    this.searchQuery();
    this.selectedCategory();
    this.selectedStock();
    this.currentPage();
    this.loadProducts();
  }, { allowSignalWrites: true });

  ngOnInit(): void {
    this.loadCategories();
  }

  loadProducts(): void {
    this.loading.set(true);
    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize(),
    };

    const search = this.searchQuery();
    if (search) params.search = search;

    const catId = this.selectedCategory();
    if (catId) params.categoryId = catId;

    const stock = this.selectedStock();
    if (stock) params.stock_status = stock;

    this.api.getProducts(params).subscribe({
      next: (res: PaginatedResponse) => {
        this.products.set(res.products || []);
        this.totalCount.set(res.pagination?.total || 0);
        this.loading.set(false);
        this.selectedIds.set([]);
      },
      error: () => {
        this.toast.error('Failed to load products.');
        this.loading.set(false);
      }
    });
  }

  loadCategories(): void {
    this.api.getCategories().subscribe({
      next: (res: any) => {
        this.categories.set(res.categories || res || []);
      },
      error: () => {}
    });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  onCategoryChange(value: string): void {
    this.selectedCategory.set(value);
    this.currentPage.set(1);
  }

  onStockChange(value: string): void {
    this.selectedStock.set(value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('');
    this.selectedStock.set('');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  // Selection
  toggleSelect(id: number): void {
    this.selectedIds.update(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
    );
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.set(this.products().map(p => p.id));
    } else {
      this.selectedIds.set([]);
    }
  }

  // Bulk actions
  bulkDelete(): void {
    const ids = this.selectedIds();
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} product(s)? This cannot be undone.`)) return;

    this.api.adminBulkDeleteProducts(ids).subscribe({
      next: () => {
        this.toast.success(`${ids.length} product(s) deleted.`);
        this.selectedIds.set([]);
        this.loadProducts();
      },
      error: () => this.toast.error('Bulk delete failed.')
    });
  }

  bulkToggleFeatured(): void {
    const ids = this.selectedIds();
    if (!ids.length) return;

    this.api.adminBulkUpdateProducts(ids, { featured: 1 }).subscribe({
      next: () => {
        this.toast.success(`${ids.length} product(s) updated.`);
        this.selectedIds.set([]);
        this.loadProducts();
      },
      error: () => this.toast.error('Bulk update failed.')
    });
  }

  // Toggle single
  toggleFeatured(product: Product): void {
    const updated = { featured: product.featured ? 0 : 1 };
    this.api.adminUpdateProduct(product.id, updated).subscribe({
      next: () => {
        this.products.update(list =>
          list.map(p => p.id === product.id ? { ...p, ...updated } : p)
        );
        this.toast.success('Product updated.');
      },
      error: () => this.toast.error('Failed to update product.')
    });
  }

  toggleActive(product: Product): void {
    const updated = { active: product.active ? 0 : 1 };
    this.api.adminUpdateProduct(product.id, updated).subscribe({
      next: () => {
        this.products.update(list =>
          list.map(p => p.id === product.id ? { ...p, ...updated } : p)
        );
        this.toast.success('Product updated.');
      },
      error: () => this.toast.error('Failed to update product.')
    });
  }

  // Image
  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = FALLBACK_IMG;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.uploadingImage.set(true);
      this.api.uploadImage(file).subscribe({
        next: (res) => {
          if (!this.formData.image) {
            this.formData.image = res.url;
          } else {
            this.formData.images = [...this.formData.images, res.url];
          }
          this.uploadingImage.set(false);
        },
        error: () => {
          this.toast.error('Image upload failed.');
          this.uploadingImage.set(false);
        }
      });
    }
    input.value = '';
  }

  removeGalleryImage(index: number): void {
    this.formData.images = this.formData.images.filter((_, i) => i !== index);
  }

  removeImage(): void {
    this.formData.image = '';
  }

  // Modal
  openAddModal(): void {
    this.editingProduct.set(null);
    this.resetForm();
    this.showModal.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    let existingImages: string[] = [];
    try { existingImages = product.images ? (typeof product.images === 'string' ? JSON.parse(product.images as any) : product.images) : []; } catch { existingImages = []; }
    this.formData = {
      name: product.name,
      brand: product.brand,
      description: product.description,
      price: product.price,
      old_price: product.old_price,
      stock: product.stock,
      category_id: product.category_id ?? null,
      image: product.image,
      images: existingImages,
      featured: product.featured,
      active: product.active,
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
    this.resetForm();
  }

  saveProduct(): void {
    if (this.saving()) return;
    this.saving.set(true);

    const payload = {
      ...this.formData,
      price: Number(this.formData.price),
      old_price: this.formData.old_price ? Number(this.formData.old_price) : null,
      stock: Number(this.formData.stock),
      category_id: this.formData.category_id ? Number(this.formData.category_id) : null,
    };

    const editing = this.editingProduct();

    const request$ = editing
      ? this.api.adminUpdateProduct(editing.id, payload)
      : this.api.adminCreateProduct(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(editing ? 'Product updated.' : 'Product created.');
        this.closeModal();
        this.loadProducts();
        this.saving.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to save product.');
        this.saving.set(false);
      }
    });
  }

  // Delete
  confirmDelete(product: Product): void {
    this.deletingProduct.set(product);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.deletingProduct.set(null);
  }

  deleteProduct(): void {
    const product = this.deletingProduct();
    if (!product || this.deleting()) return;
    this.deleting.set(true);

    this.api.adminDeleteProduct(product.id).subscribe({
      next: () => {
        this.toast.success('Product deleted.');
        this.cancelDelete();
        this.loadProducts();
        this.deleting.set(false);
      },
      error: () => {
        this.toast.error('Failed to delete product.');
        this.deleting.set(false);
      }
    });
  }

  private resetForm(): void {
    this.formData = {
      name: '',
      brand: '',
      description: '',
      price: 0,
      old_price: null,
      stock: 0,
      category_id: null,
      image: '',
      images: [],
      featured: 0,
      active: 1,
    };
  }

  // ===== AI UPLOAD METHODS =====

  openAiModal(): void {
    this.aiStep.set('upload');
    this.aiSelectedFiles.set([]);
    this.aiError.set('');
    this.aiWarnings.set([]);
    this.aiExtractedProducts.set([]);
    this.aiDragOver.set(false);
    this.aiAnalyzing.set(false);
    this.aiSaving.set(false);
    this.showAiModal.set(true);
    // Load categories for the review step
    this.api.getCategories().subscribe({
      next: (res: any) => this.aiCategories.set(res.categories || res || []),
      error: () => {}
    });
  }

  closeAiModal(): void {
    this.showAiModal.set(false);
  }

  onAiDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.aiDragOver.set(true);
  }

  onAiDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.aiDragOver.set(false);
  }

  onAiDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.aiDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files) {
      this.addAiFiles(Array.from(files));
    }
  }

  onAiFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addAiFiles(Array.from(input.files));
    }
    input.value = '';
  }

  private addAiFiles(files: File[]): void {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      this.aiError.set('Please select image files only (JPG, PNG, WEBP).');
      return;
    }
    const current = this.aiSelectedFiles();
    const combined = [...current, ...imageFiles].slice(0, 5); // max 5 files
    this.aiSelectedFiles.set(combined);
    this.aiError.set('');
  }

  removeAiFile(index: number): void {
    this.aiSelectedFiles.update(files => files.filter((_, i) => i !== index));
  }

  analyzeAiImages(): void {
    if (this.aiSelectedFiles().length === 0) return;
    this.aiAnalyzing.set(true);
    this.aiError.set('');
    this.aiWarnings.set([]);

    this.api.aiExtractProduct(this.aiSelectedFiles()).subscribe({
      next: (res: any) => {
        const products = (res.products || []).map((p: any) => ({
          name: p.name || '',
          description: p.description || '',
          price: p.price || 0,
          old_price: p.old_price || null,
          brand: p.brand || '',
          stock: p.stock || 0,
          category_id: p.category_id || null,
          category_name: p.category_name || p.category_suggestion || '',
          image: p.image || '',
          images: p.images || [],
        }));
        // Collect per-image warnings if some images failed
        const warnings: string[] = [];
        if (res.errors && Array.isArray(res.errors)) {
          res.errors.forEach((e: any) => {
            warnings.push(`${e.filename}: ${e.reason}`);
          });
        }
        this.aiWarnings.set(warnings);
        this.aiExtractedProducts.set(products);
        this.aiStep.set('review');
        this.aiAnalyzing.set(false);
      },
      error: (err) => {
        const status = err?.status;
        const body = err?.error || {};
        // Backend returns 503 for missing key, 502 for deprecated model
        if ((status === 503 && body.code === 'GEMINI_API_KEY_MISSING') || (status === 502 && body.code === 'MODEL_NOT_FOUND')) {
          this.aiError.set(`${body.error} ${body.details || ''}`.trim());
        } else if (body.details) {
          this.aiError.set(`${body.error} ${body.details}`.trim());
        } else {
          this.aiError.set(body.error || 'Failed to analyze images. Please try again.');
        }
        this.aiAnalyzing.set(false);
      }
    });
  }

  removeAiProduct(index: number): void {
    this.aiExtractedProducts.update(products => products.filter((_, i) => i !== index));
  }

  saveAiProducts(): void {
    if (this.aiSaving() || this.aiExtractedProducts().length === 0) return;
    this.aiSaving.set(true);

    const products = this.aiExtractedProducts();
    let savedCount = 0;
    let failCount = 0;

    products.forEach((product, index) => {
      const payload = {
        name: product.name,
        description: product.description,
        price: Number(product.price) || 0,
        old_price: product.old_price ? Number(product.old_price) : null,
        stock: Number(product.stock) || 0,
        category_id: product.category_id ? Number(product.category_id) : null,
        brand: product.brand || '',
        image: product.image || '',
        images: product.images || [],
        featured: 0,
        active: 1,
      };

      this.api.adminCreateProduct(payload).subscribe({
        next: () => {
          savedCount++;
          if (savedCount + failCount === products.length) {
            this.finishAiSave(savedCount, failCount);
          }
        },
        error: () => {
          failCount++;
          if (savedCount + failCount === products.length) {
            this.finishAiSave(savedCount, failCount);
          }
        }
      });
    });
  }

  private finishAiSave(saved: number, failed: number): void {
    this.aiSaving.set(false);
    if (failed > 0) {
      this.toast.warning(`${saved} product(s) created, ${failed} failed.`);
    } else {
      this.toast.success(`${saved} product(s) created successfully!`);
    }
    this.closeAiModal();
    this.loadProducts();
  }
}
