import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: number;
  link?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);
  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);

  load(): void {
    this.api.adminGetNotifications().subscribe({
      next: (res: any) => {
        this.notifications.set(res.notifications || []);
        this.unreadCount.set(res.notifications?.filter((n: Notification) => !n.read).length || 0);
      },
      error: () => {},
    });
  }

  markRead(id: number): void {
    this.api.adminMarkNotificationRead(id).subscribe({
      next: () => {
        this.notifications.update(ns => ns.map(n => n.id === id ? { ...n, read: 1 } : n));
        this.unreadCount.update(c => Math.max(0, c - 1));
      },
    });
  }

  markAllRead(): void {
    this.api.adminMarkAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.update(ns => ns.map(n => ({ ...n, read: 1 })));
        this.unreadCount.set(0);
      },
    });
  }
}
