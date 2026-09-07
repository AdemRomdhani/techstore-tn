import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class KeyboardService {
  private router = inject(Router);

  init(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K - focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-bar input') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
      // Ctrl+D - dark mode toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const darkMode = document.querySelector('[data-dark-toggle]') as HTMLButtonElement;
        if (darkMode) darkMode.click();
      }
      // Escape - close modals
      if (e.key === 'Escape') {
        const closeBtn = document.querySelector('.modal.show .btn-close') as HTMLButtonElement;
        if (closeBtn) closeBtn.click();
      }
    });
  }
}
