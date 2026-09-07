import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DarkModeService {
  isDark = signal<boolean>(this.getStored());

  constructor() {
    document.documentElement.classList.toggle('dark-mode', this.isDark());
    effect(() => {
      const dark = this.isDark();
      localStorage.setItem('admin_dark_mode', String(dark));
      document.documentElement.classList.toggle('dark-mode', dark);
    });
  }

  toggle(): void {
    this.isDark.update(v => !v);
  }

  private getStored(): boolean {
    try {
      return localStorage.getItem('admin_dark_mode') === 'true';
    } catch { return false; }
  }
}
