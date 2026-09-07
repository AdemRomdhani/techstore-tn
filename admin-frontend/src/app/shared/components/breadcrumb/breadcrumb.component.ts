import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item"><a routerLink="/dashboard" class="text-decoration-none">Home</a></li>
        @for (item of items(); track item.label; let last = $last) {
          <li class="breadcrumb-item" [class.active]="last" [attr.aria-current]="last ? 'page' : null">
            @if (!last && item.path) {
              <a [routerLink]="item.path" class="text-decoration-none">{{ item.label }}</a>
            } @else {
              {{ item.label }}
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class BreadcrumbComponent implements OnInit {
  private router = inject(Router);
  items = signal<{ label: string; path?: string }[]>([]);

  private labelMap: Record<string, string> = {
    dashboard: 'Dashboard',
    products: 'Products',
    orders: 'Orders',
    users: 'Users',
    categories: 'Categories',
    coupons: 'Coupons',
    contacts: 'Messages',
    settings: 'Settings',
  };

  ngOnInit(): void {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.updateBreadcrumbs();
    });
    this.updateBreadcrumbs();
  }

  private updateBreadcrumbs(): void {
    const segments = this.router.url.split('/').filter(Boolean);
    const items: { label: string; path?: string }[] = [];
    let path = '';
    segments.forEach((seg, i) => {
      path += '/' + seg;
      const isLast = i === segments.length - 1;
      items.push({
        label: this.labelMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
        path: isLast ? undefined : path,
      });
    });
    this.items.set(items);
  }
}
