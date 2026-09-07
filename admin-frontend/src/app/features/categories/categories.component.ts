import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  product_count: number;
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-fluid py-3 py-md-4 px-2 px-sm-3">
      <div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3 mb-md-4">
        <div>
          <h4 class="fw-bold mb-0" style="color: var(--text-primary); font-size: clamp(1rem, 3vw, 1.25rem);">Categories</h4>
          <small class="d-none d-md-block" style="color: var(--text-muted);">{{ categories().length }} categories total</small>
        </div>
        <button class="btn btn-primary btn-sm" (click)="openAddModal()">
          <i class="bi bi-plus-lg me-1"></i> <span class="d-none d-sm-inline">Add Category</span><span class="d-sm-none">Add</span>
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Loading categories..."></app-loading-spinner>
      } @else {
        <div class="row g-3">
          @for (category of categories(); track category.id) {
            <div class="col-12 col-md-6 col-lg-4">
              <div class="card h-100" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'" style="border-radius: 12px;">
                <div class="card-body d-flex flex-column">
                  <div class="d-flex align-items-center mb-3">
                    <div class="me-3 d-flex align-items-center">
                      <i class="bi bi-grip-vertical me-2" style="cursor: grab;" [style.color]="'var(--text-muted)'"></i>
                      @if (category.image) {
                        <img [src]="category.image" [alt]="category.name" class="rounded-circle" [style.border]="'2px solid var(--border-color)'" style="width: 48px; height: 48px; object-fit: cover;" />
                      } @else {
                        <div class="rounded-circle d-flex align-items-center justify-content-center"
                             style="width: 48px; height: 48px; background: linear-gradient(135deg, var(--primary), #06b6d4);">
                          <i class="bi text-white" [ngClass]="category.icon || 'bi-folder'"></i>
                        </div>
                      }
                    </div>
                    <div class="flex-grow-1">
                      <h6 class="fw-bold mb-0" style="color: var(--text-primary);">{{ category.name }}</h6>
                      <small style="color: var(--text-muted);">{{ category.slug }}</small>
                    </div>
                    <span class="badge" [style.background]="'rgba(14, 165, 233, 0.15)'" [style.color]="'var(--primary)'">
                      {{ category.product_count }} products
                    </span>
                  </div>
                  <p class="small flex-grow-1 mb-3" style="color: var(--text-muted);">{{ category.description || 'No description' }}</p>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary" (click)="openEditModal(category)">
                      <i class="bi bi-pencil me-1"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" (click)="confirmDelete(category)">
                      <i class="bi bi-trash me-1"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="col-12">
              <div class="text-center py-5">
                      <i class="bi bi-folder-x fs-1" [style.color]="'var(--text-muted)'"></i>
                <p class="mt-2" style="color: var(--text-muted);">No categories found</p>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (showModal()) {
      <div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);" (click)="closeModal()">
        <div class="modal-dialog modal-dialog-centered" (click)="$event.stopPropagation()">
          <div class="modal-content border-0 shadow-lg" [style.background]="'var(--bg-surface)'" style="border-radius: 16px;">
            <div class="modal-header border-0 pb-0" [style.border-color]="'var(--border-color) !important'">
              <h5 class="fw-bold" style="color: var(--text-primary);">{{ editingCategory() ? 'Edit Category' : 'Add Category' }}</h5>
              <button type="button" class="btn-close" (click)="closeModal()"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label fw-semibold">Name</label>
                <input type="text" class="form-control" [(ngModel)]="formData.name" placeholder="Category name">
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Description</label>
                <textarea class="form-control" rows="3" [(ngModel)]="formData.description" placeholder="Short description"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Icon (Bootstrap Icon class)</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="bi" [ngClass]="formData.icon || 'bi-folder'"></i></span>
                  <input type="text" class="form-control" [(ngModel)]="formData.icon" placeholder="e.g. bi-laptop">
                </div>
                <small class="text-muted">Example: bi-laptop, bi-book, bi-headphones</small>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Image</label>
                <div class="image-upload-area" (click)="fileInput.click()" [class.has-image]="imagePreview() || formData.image">
                  <input type="file" class="d-none" accept="image/*" (change)="onFileSelected($event)" #fileInput />
                  @if (uploadingImage()) {
                    <div class="text-center py-3">
                      <div class="spinner-border mb-2" role="status" style="color: var(--primary);"></div>
                      <p class="small mb-0" style="color: var(--text-muted);">Uploading...</p>
                    </div>
                  } @else if (imagePreview() || formData.image) {
                    <div class="image-preview-wrapper">
                      <img [src]="imagePreview() || formData.image" alt="Preview" class="img-fluid rounded" />
                      <button type="button" class="btn btn-sm btn-danger image-remove-btn" (click)="removeImage(); $event.stopPropagation()">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                  } @else {
                    <div class="text-center py-3">
                      <i class="bi bi-cloud-arrow-up fs-1" style="color: var(--text-muted);"></i>
                      <p class="small mb-0 mt-1" style="color: var(--text-muted);">Click to upload image</p>
                      <small style="color: var(--text-muted);">JPG, PNG or WEBP</small>
                    </div>
                  }
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0" [style.border-color]="'var(--border-color)'">
              <button type="button" class="btn" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" [style.border]="'none'" (click)="closeModal()">Cancel</button>
              <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="saveCategory()">
                @if (saving()) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                }
                {{ editingCategory() ? 'Update' : 'Create' }}
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
              <h6 class="fw-bold" [style.color]="'var(--text-primary)'">Delete Category?</h6>
              <p class="small mb-0" [style.color]="'var(--text-muted)'">"{{ deleteTarget()?.name }}" will be permanently removed.</p>
            </div>
            <div class="modal-footer border-0 justify-content-center pt-0 pb-3" [style.border-color]="'var(--border-color)'">
              <button type="button" class="btn btn-sm" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" [style.border]="'none'" (click)="showDeleteConfirm.set(false)">Cancel</button>
              <button type="button" class="btn btn-danger btn-sm" [disabled]="deleting()" (click)="deleteCategory()">
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
  styles: [`
    .image-upload-area {
      border: 2px dashed var(--border-color);
      border-radius: 12px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-surface-alt);
    }
    .image-upload-area:hover {
      border-color: var(--primary);
      background: rgba(14, 165, 233, 0.05);
    }
    .image-upload-area.has-image {
      padding: 0.5rem;
      border-style: solid;
      border-color: var(--border-color);
    }
    .image-preview-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
    }
    .image-preview-wrapper img {
      width: 100%;
      max-height: 160px;
      object-fit: cover;
      border-radius: 8px;
    }
    .image-remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      font-size: 0.7rem;
    }
  `],
})
export class CategoriesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);
  showModal = signal(false);
  showDeleteConfirm = signal(false);
  editingCategory = signal<Category | null>(null);
  deleteTarget = signal<Category | null>(null);
  uploadingImage = signal(false);
  imagePreview = signal<string | null>(null);

  formData = {
    name: '',
    description: '',
    icon: '',
    image: '',
  };

  ngOnInit(): void {
    this.loadCategories();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);

    this.uploadingImage.set(true);
    this.api.uploadImage(file).subscribe({
      next: (res) => {
        this.formData.image = res.url;
        this.uploadingImage.set(false);
        this.toast.success('Image uploaded.');
      },
      error: () => {
        this.toast.error('Image upload failed.');
        this.uploadingImage.set(false);
        this.imagePreview.set(null);
      }
    });
  }

  removeImage(): void {
    this.imagePreview.set(null);
    this.formData.image = '';
  }

  loadCategories(): void {
    this.loading.set(true);
    this.api.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res.categories || res.data || res);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load categories');
        this.loading.set(false);
      },
    });
  }

  openAddModal(): void {
    this.editingCategory.set(null);
    this.formData = { name: '', description: '', icon: '', image: '' };
    this.imagePreview.set(null);
    this.uploadingImage.set(false);
    this.showModal.set(true);
  }

  openEditModal(category: Category): void {
    this.editingCategory.set(category);
    this.formData = {
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      image: category.image || '',
    };
    this.imagePreview.set(null);
    this.uploadingImage.set(false);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingCategory.set(null);
    this.imagePreview.set(null);
    this.uploadingImage.set(false);
  }

  saveCategory(): void {
    if (!this.formData.name.trim()) {
      this.toast.warning('Category name is required');
      return;
    }
    this.saving.set(true);
    const payload = { ...this.formData };
    const edit = this.editingCategory();

    const request$ = edit
      ? this.api.adminUpdateCategory(edit.id, payload)
      : this.api.adminCreateCategory(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(edit ? 'Category updated' : 'Category created');
        this.closeModal();
        this.loadCategories();
        this.saving.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Operation failed');
        this.saving.set(false);
      },
    });
  }

  confirmDelete(category: Category): void {
    this.deleteTarget.set(category);
    this.showDeleteConfirm.set(true);
  }

  deleteCategory(): void {
    const cat = this.deleteTarget();
    if (!cat) return;
    this.deleting.set(true);
    this.api.adminDeleteCategory(cat.id).subscribe({
      next: () => {
        this.toast.success('Category deleted');
        this.showDeleteConfirm.set(false);
        this.deleteTarget.set(null);
        this.loadCategories();
        this.deleting.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Delete failed');
        this.deleting.set(false);
      },
    });
  }
}
