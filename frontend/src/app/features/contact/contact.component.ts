import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container py-3 py-md-5 px-2 px-sm-3 fade-in">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="text-center mb-3 mb-md-4">
            <h1 class="fw-bold" style="color: #e2e8f0; font-size: clamp(1.5rem, 4vw, 2.5rem);">Get in Touch</h1>
            <p style="color: #94a3b8;">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
          </div>
          <div class="row g-2 g-md-3 mb-3 mb-md-4 text-center">
            <div class="col-4 col-md-4">
              <div class="card p-2 p-md-3 h-100" style="background: #1e293b; border: 1px solid #334155;">
                <i class="bi bi-envelope fs-4 fs-md-2" style="color: #0ea5e9;"></i>
                <h6 class="mt-1 mt-md-2 fw-bold mb-0" style="color: #e2e8f0; font-size: 0.8rem;">Email</h6>
                <small class="d-none d-sm-block" style="color: #94a3b8;">support&#64;techstore.com</small>
              </div>
            </div>
            <div class="col-4 col-md-4">
              <div class="card p-2 p-md-3 h-100" style="background: #1e293b; border: 1px solid #334155;">
                <i class="bi bi-telephone fs-4 fs-md-2" style="color: #0ea5e9;"></i>
                <h6 class="mt-1 mt-md-2 fw-bold mb-0" style="color: #e2e8f0; font-size: 0.8rem;">Phone</h6>
                <small class="d-none d-sm-block" style="color: #94a3b8;">+216 71 123 456</small>
              </div>
            </div>
            <div class="col-4 col-md-4">
              <div class="card p-2 p-md-3 h-100" style="background: #1e293b; border: 1px solid #334155;">
                <i class="bi bi-geo-alt fs-4 fs-md-2" style="color: #0ea5e9;"></i>
                <h6 class="mt-1 mt-md-2 fw-bold mb-0" style="color: #e2e8f0; font-size: 0.8rem;">Address</h6>
                <small class="d-none d-sm-block" style="color: #94a3b8;">Tunis, Tunisia</small>
              </div>
            </div>
          </div>
          <div class="card p-3 p-md-4" style="background: #1e293b; border: 1px solid #334155;">
            @if (error) {
              <div class="alert alert-danger py-2 small" style="background: rgba(239,68,68,0.15); border-color: #334155; color: #f87171;">{{ error }}</div>
            }
            <form (submit)="onSubmit($event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label fw-semibold" style="color: #e2e8f0;">Name</label>
                  <input type="text" class="form-control" [(ngModel)]="form.name" name="name" required placeholder="Your name" style="background: #0f172a; border-color: #334155; color: #e2e8f0;" />
                </div>
                <div class="col-md-6">
                  <label class="form-label fw-semibold" style="color: #e2e8f0;">Email</label>
                  <input type="email" class="form-control" [(ngModel)]="form.email" name="email" required placeholder="your@email.com" style="background: #0f172a; border-color: #334155; color: #e2e8f0;" />
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold" style="color: #e2e8f0;">Subject</label>
                  <input type="text" class="form-control" [(ngModel)]="form.subject" name="subject" required placeholder="How can we help?" style="background: #0f172a; border-color: #334155; color: #e2e8f0;" />
                </div>
                <div class="col-12">
                  <label class="form-label fw-semibold" style="color: #e2e8f0;">Message</label>
                  <textarea class="form-control" rows="5" [(ngModel)]="form.message" name="message" required minlength="10" placeholder="Write your message here..." style="background: #0f172a; border-color: #334155; color: #e2e8f0;"></textarea>
                </div>
              </div>
              <button type="submit" class="btn mt-3" style="background: #0ea5e9; color: #fff; border: none;" [disabled]="sending">
                @if (sending) { <span class="spinner-border spinner-border-sm me-2"></span> }
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ContactComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  form = { name: '', email: '', subject: '', message: '' };
  sending = false;
  error = '';

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error = '';
    this.sending = true;
    try {
      await this.api.sendContact(this.form).toPromise();
      this.toast.success('Message sent! We\'ll get back to you soon.');
      this.form = { name: '', email: '', subject: '', message: '' };
    } catch (err: any) {
      this.error = err.error?.errors?.[0]?.msg || err.error?.error || 'Failed to send message';
    }
    this.sending = false;
    this.cdr.markForCheck();
  }
}
