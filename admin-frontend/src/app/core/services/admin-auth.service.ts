import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, lastValueFrom, shareReplay, catchError, throwError, of } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

const TOKEN_KEY = 'admin_access_token';
const REFRESH_KEY = 'admin_refresh_token';
const USER_KEY = 'admin_user';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API = 'https://tech-store-api-wczy.onrender.com/api/admin-auth';

  currentUser = signal<User | null>(this.getStoredUser());
  isAuthenticated = signal<boolean>(!!this.getToken());
  showSessionWarning = signal(false);
  sessionCountdown = signal(0);

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  isRefreshing = false;
  private refresh$!: Observable<AuthResponse>;

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, { email, password }).pipe(
      tap((res) => {
        if (res.user.role !== 'admin') throw new Error('Not an admin account');
        this.setAuth(res);
      })
    );
  }

  initializeAuth(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return Promise.resolve(false);

    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      this.logout();
      return Promise.resolve(false);
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        return lastValueFrom(this.refreshAccessToken())
          .then(() => true)
          .catch(() => { this.logout(); return false; });
      }
      this.logout();
      return Promise.resolve(false);
    }

    this.scheduleRefresh(decoded.exp);
    return lastValueFrom(this.getMe())
      .then(() => true)
      .catch(() => {
        const rt = this.getRefreshToken();
        if (rt) {
          return lastValueFrom(this.refreshAccessToken())
            .then(() => true)
            .catch(() => { this.logout(); return false; });
        }
        this.logout();
        return false;
      });
  }

  getMe(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.API}/me`).pipe(
      tap((res) => {
        this.currentUser.set(res.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.API}/change-password`, { currentPassword, newPassword });
  }

  logout(): void {
    this.clearTimers();
    this.isRefreshing = false;
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.API}/logout`, {}).subscribe({ error: () => {} });
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.showSessionWarning.set(false);
    this.sessionCountdown.set(0);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  refreshAccessToken(): Observable<AuthResponse> {
    if (this.isRefreshing && this.refresh$) {
      return this.refresh$;
    }
    this.isRefreshing = true;
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.isRefreshing = false;
      return throwError(() => new Error('No refresh token'));
    }
    this.refresh$ = this.http.post<AuthResponse>(`${this.API}/refresh`, { refreshToken }).pipe(
      tap((res) => {
        this.isRefreshing = false;
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(REFRESH_KEY, res.refreshToken);
        const decoded = this.decodeToken(res.token);
        if (decoded?.exp) this.scheduleRefresh(decoded.exp);
        this.showSessionWarning.set(false);
        this.sessionCountdown.set(0);
      }),
      catchError((err) => {
        this.isRefreshing = false;
        return throwError(() => err);
      }),
      shareReplay(1)
    );
    return this.refresh$;
  }

  stayLoggedIn(): void {
    this.clearTimers();
    this.showSessionWarning.set(false);
    this.sessionCountdown.set(0);
    const rt = this.getRefreshToken();
    if (rt) {
      this.refreshAccessToken().subscribe({ error: () => this.logout() });
    } else {
      this.logout();
    }
  }

  private setAuth(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    if (res.refreshToken) localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user);
    this.isAuthenticated.set(true);
    const decoded = this.decodeToken(res.token);
    if (decoded?.exp) this.scheduleRefresh(decoded.exp);
  }

  private getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private decodeToken(token: string): { exp?: number } | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch { return null; }
  }

  private scheduleRefresh(expiresAt: number): void {
    this.clearTimers();
    const nowSec = Math.floor(Date.now() / 1000);
    const timeLeft = expiresAt - nowSec;
    if (timeLeft <= 0) return;

    const refreshMs = Math.max(0, (timeLeft - 60) * 1000);
    const warningMs = Math.max(0, (timeLeft - 120) * 1000);

    this.refreshTimer = setTimeout(() => {
      const rt = this.getRefreshToken();
      if (rt) this.refreshAccessToken().subscribe({ error: () => this.logout() });
    }, refreshMs);

    if (warningMs > 0) {
      this.warningTimer = setTimeout(() => {
        this.showSessionWarning.set(true);
        this.startCountdown(expiresAt);
      }, warningMs);
    }
  }

  private startCountdown(expiresAt: number): void {
    this.clearCountdown();
    this.countdownInterval = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      this.sessionCountdown.set(remaining);
      if (remaining <= 0) { this.clearCountdown(); this.logout(); }
    }, 1000);
  }

  private clearTimers(): void {
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
    if (this.warningTimer) { clearTimeout(this.warningTimer); this.warningTimer = null; }
    this.clearCountdown();
  }

  private clearCountdown(): void {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
  }
}
