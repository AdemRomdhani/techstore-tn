import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

interface Contact {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: number;
  created_at: string;
}

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-fluid py-3 py-md-4 px-2 px-sm-3">
      <div class="d-flex justify-content-between align-items-center mb-3 mb-md-4">
        <div>
          <h4 class="fw-bold mb-0" [style.color]="'var(--text-primary)'" style="font-size: clamp(1rem, 3vw, 1.25rem);">Contact Messages</h4>
          <small style="color: var(--text-muted);">
            {{ contacts().length }} messages
            @if (unreadCount() > 0) {
              <span class="badge bg-danger ms-2">{{ unreadCount() }} unread</span>
            }
          </small>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Loading messages..."></app-loading-spinner>
      } @else {
        <div class="card" [style.background]="'var(--bg-surface)'" [style.border]="'1px solid var(--border-color)'" style="border-radius: 12px;">
          <div class="list-group list-group-flush">
            @for (contact of contacts(); track contact.id) {
              <div class="list-group-item list-group-item-action py-3"
                   [style.border-left]="contact.read ? '4px solid transparent' : '4px solid var(--primary)'"
                   [style.background]="contact.read ? 'transparent' : 'rgba(14, 165, 233, 0.08)'"
                   [style.border-color]="'var(--border-color)'"
                   (click)="openMessage(contact)"
                   style="cursor: pointer;">
                <div class="d-flex justify-content-between align-items-start">
                  <div class="d-flex align-items-start flex-grow-1 min-width-0">
                    <div class="me-3 flex-shrink-0">
                      <div class="rounded-circle d-flex align-items-center justify-content-center"
                           [style.background]="contact.read ? 'var(--border-color)' : 'var(--primary)'"
                           style="width: 40px; height: 40px;">
                        <i class="bi" [ngClass]="contact.read ? 'bi-envelope-open' : 'bi-envelope-fill'"
                           [style.color]="contact.read ? 'var(--text-muted)' : '#fff'"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 min-width-0">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <h6 class="mb-0 text-truncate me-2" [class.fw-bold]="!contact.read" style="color: var(--text-primary); max-width: 60%;">
                        {{ contact.name }}
                      </h6>
                      <small class="flex-shrink-0" style="color: var(--text-muted); font-size: 0.7rem;">{{ formatDate(contact.created_at) }}</small>
                    </div>
                      <div class="d-flex align-items-center mb-1">
                        <small class="me-2" style="color: var(--text-muted);">{{ contact.email }}</small>
                        <span class="badge" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'">{{ contact.subject }}</span>
                      </div>
                      <p class="small mb-0 text-truncate" style="color: var(--text-muted);">{{ contact.message }}</p>
                    </div>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="text-center py-5">
                <i class="bi bi-envelope-open fs-1" [style.color]="'var(--text-muted)'"></i>
                <p class="mt-2 mb-0" style="color: var(--text-muted);">No messages yet</p>
              </div>
            }
          </div>
        </div>
      }
    </div>

    @if (selectedContact()) {
      <div class="modal d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);" (click)="closeMessage()">
        <div class="modal-dialog modal-lg modal-dialog-centered" (click)="$event.stopPropagation()">
          <div class="modal-content border-0 shadow-lg" [style.background]="'var(--bg-surface)'" style="border-radius: 16px;">
            <div class="modal-header border-0 pb-0" [style.border-color]="'var(--border-color) !important'">
              <div>
                <h5 class="fw-bold mb-0" style="color: var(--text-primary);">{{ selectedContact()?.subject }}</h5>
                <small style="color: var(--text-muted);">From: {{ selectedContact()?.name }} &lt;{{ selectedContact()?.email }}&gt;</small>
              </div>
              <button type="button" class="btn-close" (click)="closeMessage()"></button>
            </div>
            <div class="modal-body">
              <div class="d-flex align-items-center mb-3 pb-3" style="border-bottom: 1px solid var(--border-color);">
                <small style="color: var(--text-muted);">
                  <i class="bi bi-calendar me-1"></i> {{ formatFullDate(selectedContact()?.created_at) }}
                </small>
                <div class="ms-auto d-flex gap-2">
                  <button class="btn btn-sm" [class.btn-outline-primary]="selectedContact()?.read"
                          [class.btn-primary]="!selectedContact()?.read"
                          (click)="toggleRead(selectedContact()!)">
                    <i class="bi me-1" [ngClass]="selectedContact()?.read ? 'bi-envelope' : 'bi-envelope-open'"></i>
                    {{ selectedContact()?.read ? 'Mark Unread' : 'Mark Read' }}
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="confirmDelete(selectedContact()!)">
                    <i class="bi bi-trash me-1"></i> Delete
                  </button>
                </div>
              </div>
              <div class="message-content" style="white-space: pre-wrap; line-height: 1.7; color: #cbd5e1;">
                {{ selectedContact()?.message }}
              </div>
            </div>
            <div class="modal-footer border-0">
              <a class="btn" [style.background]="'transparent'" [style.color]="'var(--primary)'" [style.border]="'1px solid var(--primary)'" [href]="'mailto:' + selectedContact()?.email">
                <i class="bi bi-reply me-1"></i> Reply via Email
              </a>
              <button type="button" class="btn" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" [style.border]="'none'" (click)="closeMessage()">Close</button>
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
              <h6 class="fw-bold" [style.color]="'var(--text-primary)'">Delete Message?</h6>
              <p class="small mb-0" [style.color]="'var(--text-muted)'">This message from "{{ deleteTarget()?.name }}" will be permanently removed.</p>
            </div>
            <div class="modal-footer border-0 justify-content-center pt-0 pb-3" [style.border-color]="'var(--border-color)'">
              <button type="button" class="btn btn-sm" [style.background]="'var(--border-color)'" [style.color]="'var(--text-primary)'" [style.border]="'none'" (click)="showDeleteConfirm.set(false)">Cancel</button>
              <button type="button" class="btn btn-danger btn-sm" [disabled]="deleting()" (click)="deleteContact()">
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
})
export class ContactsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  contacts = signal<Contact[]>([]);
  loading = signal(true);
  deleting = signal(false);
  selectedContact = signal<Contact | null>(null);
  showDeleteConfirm = signal(false);
  deleteTarget = signal<Contact | null>(null);

  unreadCount = signal(0);

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    this.loading.set(true);
    this.api.adminGetContacts().subscribe({
      next: (res) => {
        const data = res.messages || res.data || res;
        this.contacts.set(data);
        this.unreadCount.set(data.filter((c: Contact) => !c.read).length);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load messages');
        this.loading.set(false);
      },
    });
  }

  openMessage(contact: Contact): void {
    this.selectedContact.set(contact);
    if (!contact.read) {
      this.api.adminMarkContactRead(contact.id).subscribe({
        next: () => {
          this.contacts.update(cs => cs.map(c => c.id === contact.id ? { ...c, read: 1 } : c));
          this.selectedContact.set({ ...contact, read: 1 });
          this.unreadCount.set(this.contacts().filter((c) => !c.read).length);
        },
      });
    }
  }

  closeMessage(): void {
    this.selectedContact.set(null);
  }

  toggleRead(contact: Contact): void {
    const request$ = contact.read
      ? this.api.adminMarkContactUnread(contact.id)
      : this.api.adminMarkContactRead(contact.id);

    request$.subscribe({
      next: () => {
        const newRead = contact.read ? 0 : 1;
        this.contacts.update(cs => cs.map(c => c.id === contact.id ? { ...c, read: newRead } : c));
        this.unreadCount.set(this.contacts().filter((c) => !c.read).length);
        this.selectedContact.set({ ...contact, read: newRead });
        this.toast.info(newRead ? 'Marked as read' : 'Marked as unread');
      },
      error: () => {
        this.toast.error('Failed to update status');
      },
    });
  }

  confirmDelete(contact: Contact): void {
    this.deleteTarget.set(contact);
    this.showDeleteConfirm.set(true);
  }

  deleteContact(): void {
    const contact = this.deleteTarget();
    if (!contact) return;
    this.deleting.set(true);
    this.api.adminDeleteContact(contact.id).subscribe({
      next: () => {
        this.toast.success('Message deleted');
        this.showDeleteConfirm.set(false);
        this.deleteTarget.set(null);
        this.closeMessage();
        this.loadContacts();
        this.deleting.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Delete failed');
        this.deleting.set(false);
      },
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatFullDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
