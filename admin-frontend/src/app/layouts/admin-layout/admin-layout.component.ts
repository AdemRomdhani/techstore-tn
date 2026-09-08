import { Component, inject, OnInit, signal, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { I18nService } from '../../core/services/i18n.service';
import { DarkModeService } from '../../core/services/dark-mode.service';
import { NotificationService } from '../../core/services/notification.service';
import { KeyboardService } from '../../core/services/keyboard.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { AdminAuthService } from '../../core/services/admin-auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, BreadcrumbComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex" style="min-height: 100vh;">
      <!-- Sidebar -->
      <aside class="sidebar text-white" [class.collapsed]="sidebarCollapsed()" [class.mobile-open]="mobileMenuOpen()" [style.background]="'var(--bg-sidebar)'">
        <div class="sidebar-header p-3 d-flex align-items-center justify-content-between">
          @if (!sidebarCollapsed()) {
            <a routerLink="/dashboard" class="text-decoration-none text-white d-flex align-items-center gap-2">
              <img src="assets/781550622_1700303331226624_6712455829304365264_n-removebg-preview.png" alt="Tech Store" style="width: 36px; height: 36px; object-fit: contain;" />
              <div>
                <h6 class="mb-0 fw-bold"><span style="color: #0ea5e9;">Tech</span><span style="color: #06b6d4;"> Store</span></h6>
                <small class="text-white-50" style="font-size: 0.65rem;">Admin Panel</small>
              </div>
            </a>
          } @else {
            <a routerLink="/dashboard" class="text-decoration-none text-white d-flex align-items-center justify-content-center w-100">
              <img src="assets/781550622_1700303331226624_6712455829304365264_n-removebg-preview.png" alt="Tech Store" style="width: 36px; height: 36px; object-fit: contain;" />
            </a>
          }
          <button class="btn btn-sm btn-link text-white d-none d-lg-block" (click)="toggleSidebar()">
            <i class="bi" [ngClass]="sidebarCollapsed() ? 'bi-chevron-right' : 'bi-chevron-left'"></i>
          </button>
        </div>

        <nav class="sidebar-nav px-2 pb-3" style="overflow-y: auto; max-height: calc(100vh - 140px);">
          <ul class="nav flex-column gap-1">
            <li class="nav-item">
              <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link text-white-50" [title]="sidebarCollapsed() ? i18n.t('dashboard') : ''">
                <i class="bi bi-speedometer2"></i>
                @if (!sidebarCollapsed()) { <span>{{ i18n.t('dashboard') }}</span> }
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/products" routerLinkActive="active" class="nav-link text-white-50" [title]="sidebarCollapsed() ? i18n.t('products') : ''">
                <i class="bi bi-box-seam"></i>
                @if (!sidebarCollapsed()) { <span>{{ i18n.t('products') }}</span> }
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/orders" routerLinkActive="active" class="nav-link text-white-50" [title]="sidebarCollapsed() ? i18n.t('orders') : ''">
                <i class="bi bi-cart-check"></i>
                @if (!sidebarCollapsed()) { <span>{{ i18n.t('orders') }}</span> }
              </a>
            </li>

            <li class="mt-2 mb-1">
              @if (!sidebarCollapsed()) {
                <small class="text-white-50 text-uppercase px-2" style="font-size: 0.7rem; letter-spacing: 0.05em;">Catalog</small>
              }
            </li>
            <li class="nav-item">
              <a routerLink="/categories" routerLinkActive="active" class="nav-link text-white-50" [title]="sidebarCollapsed() ? i18n.t('categories') : ''">
                <i class="bi bi-grid"></i>
                @if (!sidebarCollapsed()) { <span>{{ i18n.t('categories') }}</span> }
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/coupons" routerLinkActive="active" class="nav-link text-white-50" [title]="sidebarCollapsed() ? i18n.t('coupons') : ''">
                <i class="bi bi-tag"></i>
                @if (!sidebarCollapsed()) { <span>{{ i18n.t('coupons') }}</span> }
              </a>
            </li>
            <li class="nav-item">
              <a routerLink="/reviews" routerLinkActive="active" class="nav-link text-white-50" [title]="sidebarCollapsed() ? i18n.t('reviews') : ''">
                <i class="bi bi-star"></i>
                @if (!sidebarCollapsed()) { <span>{{ i18n.t('reviews') }}</span> }
              </a>
            </li>

            <li class="mt-2 mb-1">
              @if (!sidebarCollapsed()) {
                <small class="text-white-50 text-uppercase px-2" style="font-size: 0.7rem; letter-spacing: 0.05em;">Communication</small>
              }
            </li>
            <li class="nav-item">
              <a routerLink="/contacts" routerLinkActive="active" class="nav-link text-white-50 position-relative" [title]="sidebarCollapsed() ? i18n.t('messages') : ''">
                <i class="bi bi-envelope"></i>
                @if (!sidebarCollapsed()) { <span>{{ i18n.t('messages') }}</span> }
                @if (unreadCount() > 0) {
                  <span class="badge bg-danger ms-auto" style="font-size: 0.65rem;">{{ unreadCount() }}</span>
                }
              </a>
            </li>

            <li class="mt-2 mb-1">
              @if (!sidebarCollapsed()) {
                <small class="text-white-50 text-uppercase px-2" style="font-size: 0.7rem; letter-spacing: 0.05em;">System</small>
              }
            </li>
            <li class="nav-item">
              <a routerLink="/settings" routerLinkActive="active" class="nav-link text-white-50" [title]="sidebarCollapsed() ? i18n.t('settings') : ''">
                <i class="bi bi-gear"></i>
                @if (!sidebarCollapsed()) { <span>{{ i18n.t('settings') }}</span> }
              </a>
            </li>

            <li class="mt-3 border-top pt-3">
              <a [href]="storeUrl" target="_blank" class="nav-link text-white-50" [title]="sidebarCollapsed() ? i18n.t('viewStore') : ''">
                <i class="bi bi-box-arrow-up-right"></i>
                @if (!sidebarCollapsed()) { <span>{{ i18n.t('viewStore') }}</span> }
              </a>
            </li>
            <li class="nav-item">
              <a href="#" (click)="onLogout($event)" class="nav-link text-white-50" [title]="sidebarCollapsed() ? 'Logout' : ''">
                <i class="bi bi-box-arrow-right"></i>
                @if (!sidebarCollapsed()) { <span>Logout</span> }
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Mobile overlay -->
      @if (mobileMenuOpen()) {
        <div class="sidebar-overlay" (click)="mobileMenuOpen.set(false)"></div>
      }

      <!-- Main content -->
      <div class="flex-grow-1 main-content">
        <!-- Header -->
        <header class="admin-header border-bottom px-4 d-flex justify-content-between align-items-center" [style.background]="'var(--bg-header)'" [style.border-color]="'var(--border-color) !important'">
          <div class="d-flex align-items-center gap-3">
            <button class="btn btn-link d-lg-none p-1" (click)="mobileMenuOpen.set(!mobileMenuOpen())" [style.color]="'var(--text-muted)'">
              <i class="bi bi-list fs-4"></i>
            </button>
            <h5 class="mb-0 fw-bold" [style.color]="'var(--text-primary)'">{{ pageTitle() }}</h5>
          </div>
          <div class="d-flex align-items-center gap-2">
            <div class="search-bar d-none d-md-block">
              <input type="text" class="form-control form-control-sm" placeholder="Search... (Ctrl+K)">
              <i class="bi bi-search"></i>
            </div>

            <button class="btn btn-sm btn-link p-1" data-dark-toggle (click)="darkMode.toggle()" [title]="darkMode.isDark() ? 'Light mode' : 'Dark mode'" [style.color]="'var(--text-muted)'">
              <i class="bi fs-5" [ngClass]="darkMode.isDark() ? 'bi-sun-fill' : 'bi-moon-fill'"></i>
            </button>

            <div class="position-relative">
              <button class="btn btn-sm btn-link p-1" (click)="toggleNotif($event)" [style.color]="'var(--text-muted)'">
                <i class="bi bi-bell fs-5"></i>
                @if (notifService.unreadCount() > 0) {
                  <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger badge-pulse" style="font-size: 0.6rem;">
                    {{ notifService.unreadCount() }}
                  </span>
                }
              </button>
              @if (notifOpen) {
                <div class="notif-panel shadow" (click)="$event.stopPropagation()">
                  <div class="d-flex justify-content-between align-items-center px-3 py-2" [style.border-bottom]="'1px solid var(--border-color)'">
                    <h6 class="mb-0 fw-bold" style="font-size: 0.9rem;" [style.color]="'var(--text-primary)'">Notifications</h6>
                    <div class="d-flex align-items-center gap-2">
                      @if (notifService.unreadCount() > 0) {
                        <button class="btn btn-sm p-0" style="background: none; border: none;" [style.color]="'var(--primary)'" (click)="notifService.markAllRead()">Mark all read</button>
                      }
                      <button class="btn btn-sm p-0" style="background: none; border: none;" [style.color]="'var(--text-muted)'" (click)="notifOpen = false">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                  </div>
                  <div class="notif-list">
                    @if (notifService.notifications().length === 0) {
                      <div class="text-center py-4" [style.color]="'var(--text-muted)'">
                        <i class="bi bi-bell-slash fs-3 d-block mb-2"></i>
                        <small>No notifications</small>
                      </div>
                    } @else {
                      @for (n of notifService.notifications(); track n.id) {
                        <div class="notif-item px-3 py-2" [class.fw-semibold]="!n.read" (click)="notifService.markRead(n.id); notifOpen = false" style="cursor: pointer;">
                          <div class="d-flex justify-content-between align-items-start gap-2">
                            <span class="small" [style.color]="'var(--text-primary)'">{{ n.title }}</span>
                            <small style="white-space: nowrap; flex-shrink: 0;" [style.color]="'var(--text-muted)'">{{ n.created_at }}</small>
                          </div>
                          <small [style.color]="'var(--text-secondary)'">{{ n.message }}</small>
                        </div>
                      }
                    }
                  </div>
                </div>
              }
            </div>


          </div>
        </header>

        <!-- Page content -->
        <div class="p-2 p-sm-3 p-md-4">
          <app-breadcrumb></app-breadcrumb>
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>

    <!-- Session Warning Modal -->
    @if (auth.showSessionWarning()) {
      <div class="session-modal-backdrop">
        <div class="session-modal shadow">
          <div class="text-center">
            <i class="bi bi-clock-history fs-1 mb-3" style="color: #f59e0b;"></i>
            <h5 class="fw-bold" style="color: #e2e8f0;">Session Expiring</h5>
            <p class="text-muted small">Your session will expire in <strong>{{ auth.sessionCountdown() }}</strong> seconds</p>
            <div class="d-flex gap-2 justify-content-center mt-3">
              <button class="btn btn-sm" style="background: #0ea5e9; color: #fff;" (click)="auth.stayLoggedIn()">Stay Logged In</button>
              <button class="btn btn-sm btn-outline-danger" (click)="auth.logout()">Logout</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .sidebar {
      width: 260px;
      flex-shrink: 0;
      transition: width 0.3s ease;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 1040;
      overflow-y: auto;
      color: #e2e8f0;
    }
    .sidebar.collapsed {
      width: 70px;
    }
    .sidebar .nav-link {
      padding: 0.65rem 0.8rem;
      border-radius: 8px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      white-space: nowrap;
    }
    .sidebar .nav-link i {
      font-size: 1.1rem;
      min-width: 20px;
      text-align: center;
    }
    .sidebar .nav-link:hover {
      background: rgba(255,255,255,0.1);
      color: white !important;
    }
    .sidebar .nav-link.active {
      background: var(--primary);
      color: white !important;
    }
    .main-content {
      margin-left: 260px;
      transition: margin-left 0.3s ease;
      min-height: 100vh;
      background: var(--bg-body);
    }
    .collapsed ~ .main-content,
    .sidebar.collapsed ~ .main-content {
      margin-left: 70px;
    }
    .admin-header {
      position: sticky;
      top: 0;
      z-index: 1030;
      height: 64px;
    }
    .sidebar-overlay {
      display: none;
    }
    .notif-dropdown {
      border: 1px solid var(--border);
    }
    .notif-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 380px;
      max-height: 70vh;
      background: var(--bg-dropdown);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      z-index: 9999;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .notif-list {
      overflow-y: auto;
      max-height: calc(70vh - 50px);
      flex: 1;
    }
    .notif-item {
      cursor: pointer;
      border-bottom: 1px solid var(--border-color);
      transition: background 0.15s;
    }
    .notif-item:last-child {
      border-bottom: none;
    }
    .notif-item:hover {
      background: rgba(14, 165, 233, 0.1) !important;
    }
    @media (max-width: 991.98px) {
      .sidebar {
        transform: translateX(-100%);
      }
      .sidebar.mobile-open {
        transform: translateX(0);
      }
      .main-content {
        margin-left: 0 !important;
      }
      .sidebar-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1035;
      }
      .admin-header {
        padding: 0 0.75rem !important;
        height: 56px;
      }
      .admin-header h5 {
        font-size: 0.95rem;
      }
      .notif-panel {
        position: fixed;
        top: 56px;
        right: 8px;
        left: 8px;
        width: auto;
        max-width: 100%;
        max-height: 80vh;
        background: var(--bg-dropdown);
        border: 1px solid var(--border-color);
      }
      .notif-list {
        max-height: calc(80vh - 50px);
      }
    }
    @media (max-width: 576px) {
      .search-bar {
        display: none !important;
      }
      .notif-panel {
        left: 4px;
        right: 4px;
        width: auto;
      }
      .admin-header h5 {
        font-size: 0.85rem !important;
      }
      .admin-header .d-flex {
        gap: 0.5rem !important;
      }
    }
    .session-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .session-modal {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
    }
  `],
})
export class AdminLayoutComponent implements OnInit {
  auth = inject(AdminAuthService);
  i18n = inject(I18nService);
  private router = inject(Router);
  darkMode = inject(DarkModeService);
  notifService = inject(NotificationService);
  private keyboardService = inject(KeyboardService);
  storeUrl = 'https://tech-store-frontend-1c73.onrender.com';

  sidebarCollapsed = signal(false);
  mobileMenuOpen = signal(false);
  notifOpen = false;
  unreadCount = signal(0);
  pageTitle = signal('Dashboard');

  ngOnInit(): void {
    this.updatePageTitle();
    this.loadUnreadCount();
    this.keyboardService.init();
    this.notifService.load();
  }

  @HostListener('click', ['$event'])
  onDocClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.position-relative')) {
      this.notifOpen = false;
    }
  }

  toggleNotif(event: Event): void {
    event.stopPropagation();
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) {
      this.notifService.load();
    }
  }

  private updatePageTitle(): void {
    const setTitle = () => {
      const url = this.router.url.split('?')[0].split('#')[0];
      const titleMap: Record<string, string> = {
        '/dashboard': this.i18n.t('dashboard'),
        '/products': this.i18n.t('products'),
        '/orders': this.i18n.t('orders'),
        '/categories': this.i18n.t('categories'),
        '/coupons': this.i18n.t('coupons'),
        '/reviews': this.i18n.t('reviews'),
        '/contacts': this.i18n.t('messages'),
        '/settings': this.i18n.t('settings'),
      };
      const match = Object.keys(titleMap).find(k => url === k || url.startsWith(k + '/'));
      this.pageTitle.set(match ? titleMap[match] : this.i18n.t('dashboard'));
    };
    setTitle();
    this.router.events.subscribe(() => setTitle());
  }

  private loadUnreadCount(): void {
    this.notifService.unreadCount();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  onLogout(event: Event): void {
    event.preventDefault();
    this.auth.logout();
  }
}
