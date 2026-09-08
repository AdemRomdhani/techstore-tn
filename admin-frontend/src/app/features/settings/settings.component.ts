import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

interface Settings {
  site_name: string;
  site_tagline: string;
  currency: string;
  free_shipping_threshold: number;
  standard_shipping: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-fluid py-3 py-md-4 px-2 px-sm-3">
      <div class="d-flex justify-content-between align-items-center mb-3 mb-md-4">
        <div>
          <h4 class="fw-bold mb-0" [style.color]="'var(--text-primary)'" style="font-size: clamp(1rem, 3vw, 1.25rem);">Settings</h4>
          <small class="d-none d-md-block" [style.color]="'var(--text-muted)'">Manage your store settings</small>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Loading settings..."></app-loading-spinner>
      } @else {
        <form (submit)="saveSettings($event)">
          <div class="row g-4">
            <div class="col-lg-8">
              <div class="card mb-4" [style.background]="'var(--bg-surface)'" style="border-radius: 12px;" [style.border]="'1px solid var(--border-color)'">
                <div class="card-body p-3 p-md-4">
                  <div class="d-flex align-items-center mb-4">
                    <div class="rounded-circle d-flex align-items-center justify-content-center me-3"
                         style="width: 40px; height: 40px; background: linear-gradient(135deg, #0ea5e9, #06b6d4);">
                      <i class="bi bi-gear text-white"></i>
                    </div>
                    <div>
                      <h6 class="fw-bold mb-0" [style.color]="'var(--text-primary)'">General Settings</h6>
                      <small [style.color]="'var(--text-muted)'">Basic store configuration</small>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label class="form-label fw-semibold">Site Name</label>
                    <input type="text" class="form-control" [(ngModel)]="settings.site_name" name="site_name"
                           placeholder="My Store" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'">
                  </div>

                  <div class="mb-0">
                    <label class="form-label fw-semibold">Site Tagline</label>
                    <input type="text" class="form-control" [(ngModel)]="settings.site_tagline" name="site_tagline"
                           placeholder="Your store tagline" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'">
                  </div>
                </div>
              </div>

              <div class="card" style="border-radius: 12px;" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
                <div class="card-body p-3 p-md-4">
                  <div class="d-flex align-items-center mb-4">
                    <div class="rounded-circle d-flex align-items-center justify-content-center me-3"
                         style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #059669);">
                      <i class="bi bi-cart text-white"></i>
                    </div>
                    <div>
                      <h6 class="fw-bold mb-0" [style.color]="'var(--text-primary)'">Commerce Settings</h6>
                      <small [style.color]="'var(--text-muted)'">Shipping and currency configuration</small>
                    </div>
                  </div>

                  <div class="mb-3">
                    <label class="form-label fw-semibold">Currency</label>
                    <select class="form-select" [(ngModel)]="settings.currency" name="currency" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'">
                      <option value="TND">TND - Tunisian Dinar</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                    </select>
                  </div>

                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Free Shipping Threshold</label>
                      <div class="input-group">
                        <span class="input-group-text" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-secondary)'">{{ settings.currency }}</span>
                        <input type="number" class="form-control" [(ngModel)]="settings.free_shipping_threshold"
                               name="free_shipping_threshold" min="0" step="0.01" placeholder="50.00"
                               [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'">
                      </div>
                      <small [style.color]="'var(--text-muted)'">Orders above this amount get free shipping</small>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label fw-semibold">Standard Shipping Cost</label>
                      <div class="input-group">
                        <span class="input-group-text" [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-secondary)'">{{ settings.currency }}</span>
                        <input type="number" class="form-control" [(ngModel)]="settings.standard_shipping"
                               name="standard_shipping" min="0" step="0.01" placeholder="5.99"
                               [style.background]="'var(--bg-surface-alt)'" [style.border-color]="'var(--border-color)'" [style.color]="'var(--text-primary)'">
                      </div>
                      <small [style.color]="'var(--text-muted)'">Default shipping cost per order</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-lg-4">
              <div class="card" style="border-radius: 12px;" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
                <div class="card-body p-3 p-md-4">
                  <h6 class="fw-bold mb-3" [style.color]="'var(--text-primary)'">Preview</h6>
                  <div class="rounded-3 p-3 mb-3" [style.background]="'var(--bg-surface-alt)'" [style.border]="'1px solid var(--border-color)'">
                    <div class="d-flex align-items-center mb-2">
                      <div class="rounded-circle me-2"
                           style="width: 32px; height: 32px; background: linear-gradient(135deg, #0ea5e9, #06b6d4);"></div>
                      <div>
                        <strong style="font-size: 0.9rem;" [style.color]="'var(--text-primary)'">{{ settings.site_name || 'Store Name' }}</strong>
                      </div>
                    </div>
                    <small [style.color]="'var(--text-muted)'">{{ settings.site_tagline || 'Your tagline' }}</small>
                  </div>

                  <div class="small">
                    <div class="d-flex justify-content-between py-2" [style.border-bottom]="'1px solid var(--border-color)'">
                      <span [style.color]="'var(--text-muted)'">Currency</span>
                      <span class="fw-semibold" [style.color]="'var(--text-primary)'">{{ settings.currency }}</span>
                    </div>
                    <div class="d-flex justify-content-between py-2" [style.border-bottom]="'1px solid var(--border-color)'">
                      <span [style.color]="'var(--text-muted)'">Free Shipping</span>
                      <span class="fw-semibold" [style.color]="'var(--text-primary)'">Orders > {{ settings.currency }} {{ settings.free_shipping_threshold || '0' }}</span>
                    </div>
                    <div class="d-flex justify-content-between py-2">
                      <span [style.color]="'var(--text-muted)'">Standard Shipping</span>
                      <span class="fw-semibold" [style.color]="'var(--text-primary)'">{{ settings.currency }} {{ settings.standard_shipping || '0' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card mt-3" style="border-radius: 12px;" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'">
                <div class="card-body">
                  <button type="submit" class="btn w-100 py-2" [style.background]="'var(--primary)'" style="color: #fff; border: none;" [disabled]="saving()">
                    @if (saving()) {
                      <span class="spinner-border spinner-border-sm me-2"></span>
                    }
                    <i class="bi bi-check-lg me-1"></i> Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      }
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);

  settings: Settings = {
    site_name: '',
    site_tagline: '',
    currency: 'TND',
    free_shipping_threshold: 50,
    standard_shipping: 5.99,
  };

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading.set(true);
    this.api.getSettings().subscribe({
      next: (res) => {
        const data = res.settings || res;
        this.settings = {
          site_name: data.site_name || '',
          site_tagline: data.site_tagline || '',
          currency: data.currency || 'USD',
          free_shipping_threshold: data.free_shipping_threshold ?? 50,
          standard_shipping: data.standard_shipping ?? 5.99,
        };
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load settings');
        this.loading.set(false);
      },
    });
  }

  saveSettings(event: Event): void {
    event.preventDefault();
    this.saving.set(true);

    this.api.adminUpdateSettings(this.settings).subscribe({
      next: () => {
        this.toast.success('Settings saved successfully');
        this.saving.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to save settings');
        this.saving.set(false);
      },
    });
  }
}
