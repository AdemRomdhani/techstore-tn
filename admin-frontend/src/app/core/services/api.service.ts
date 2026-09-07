import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private readonly API = '/api';

  // DASHBOARD STATS
  adminGetStats(): Observable<any> {
    return this.http.get(`${this.API}/users/admin/stats`);
  }

  adminGetRevenueStats(params?: { start?: string; end?: string }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.start) httpParams = httpParams.set('start', params.start);
    if (params?.end) httpParams = httpParams.set('end', params.end);
    return this.http.get(`${this.API}/users/admin/stats`, { params: httpParams });
  }

  // PRODUCTS
  getProducts(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get(`${this.API}/products`, { params: httpParams });
  }

  getProduct(id: number): Observable<any> {
    return this.http.get(`${this.API}/products/${id}`);
  }

  adminCreateProduct(data: any): Observable<any> {
    return this.http.post(`${this.API}/products`, data);
  }

  adminUpdateProduct(id: number, data: any): Observable<any> {
    return this.http.put(`${this.API}/products/${id}`, data);
  }

  adminDeleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.API}/products/${id}`);
  }

  adminBulkDeleteProducts(ids: number[]): Observable<any> {
    return this.http.post(`${this.API}/products/admin/bulk-delete`, { ids });
  }

  adminBulkUpdateProducts(ids: number[], data: any): Observable<any> {
    return this.http.post(`${this.API}/products/admin/bulk-update`, { ids, data });
  }

  // CATEGORIES
  getCategories(): Observable<any> {
    return this.http.get(`${this.API}/categories`);
  }

  adminCreateCategory(data: any): Observable<any> {
    return this.http.post(`${this.API}/categories`, data);
  }

  adminUpdateCategory(id: number, data: any): Observable<any> {
    return this.http.put(`${this.API}/categories/${id}`, data);
  }

  adminDeleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.API}/categories/${id}`);
  }

  adminReorderCategories(order: number[]): Observable<any> {
    return this.http.put(`${this.API}/categories/admin/reorder`, { order });
  }

  // ORDERS
  adminGetAllOrders(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get(`${this.API}/orders/admin/all`, { params: httpParams });
  }

  adminGetOrderDetail(id: number): Observable<any> {
    return this.http.get(`${this.API}/orders/admin/${id}`);
  }

  adminUpdateOrderStatus(id: number, status: string, note?: string): Observable<any> {
    return this.http.put(`${this.API}/orders/admin/${id}/status`, { status, note });
  }

  adminDeleteOrder(id: number): Observable<any> {
    return this.http.delete(`${this.API}/orders/admin/${id}`);
  }

  adminExportOrders(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get(`${this.API}/orders/admin/export`, { params: httpParams, responseType: 'text' });
  }

  // COUPONS
  adminGetCoupons(): Observable<any> {
    return this.http.get(`${this.API}/coupons`);
  }

  adminCreateCoupon(data: any): Observable<any> {
    return this.http.post(`${this.API}/coupons`, data);
  }

  adminUpdateCoupon(id: number, data: any): Observable<any> {
    return this.http.put(`${this.API}/coupons/${id}`, data);
  }

  adminDeleteCoupon(id: number): Observable<any> {
    return this.http.delete(`${this.API}/coupons/${id}`);
  }

  // CONTACTS
  adminGetContacts(): Observable<any> {
    return this.http.get(`${this.API}/contact`);
  }

  adminMarkContactRead(id: number): Observable<any> {
    return this.http.put(`${this.API}/contact/${id}/read`, {});
  }

  adminMarkContactUnread(id: number): Observable<any> {
    return this.http.put(`${this.API}/contact/${id}/unread`, {});
  }

  adminDeleteContact(id: number): Observable<any> {
    return this.http.delete(`${this.API}/contact/${id}`);
  }

  adminGetUnreadCount(): Observable<any> {
    return this.http.get(`${this.API}/contact/unread-count`);
  }

  // SETTINGS
  getSettings(): Observable<any> {
    return this.http.get(`${this.API}/settings`);
  }

  adminUpdateSettings(data: any): Observable<any> {
    return this.http.put(`${this.API}/settings`, data);
  }

  // UPLOAD
  uploadImage(file: File): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ url: string; filename: string }>(`${this.API}/upload`, formData);
  }

  // NOTIFICATIONS
  adminGetNotifications(): Observable<any> { return this.http.get(`${this.API}/notifications`); }
  adminMarkNotificationRead(id: number): Observable<any> { return this.http.put(`${this.API}/notifications/${id}/read`, {}); }
  adminMarkAllNotificationsRead(): Observable<any> { return this.http.put(`${this.API}/notifications/read-all`, {}); }

  // AUDIT LOG
  adminGetAuditLog(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v) httpParams = httpParams.set(k, String(v)); });
    return this.http.get(`${this.API}/audit`, { params: httpParams });
  }

  // AI PRODUCT EXTRACTION
  aiExtractProduct(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return this.http.post(`${this.API}/ai/extract-product`, formData);
  }

  // INVENTORY
  adminGetInventoryHistory(productId: number): Observable<any> { return this.http.get(`${this.API}/inventory/history/${productId}`); }
  adminAdjustInventory(data: any): Observable<any> { return this.http.post(`${this.API}/inventory/adjust`, data); }

  // VARIANTS
  adminGetVariants(productId: number): Observable<any> { return this.http.get(`${this.API}/variants/product/${productId}`); }
  adminCreateVariant(data: any): Observable<any> { return this.http.post(`${this.API}/variants`, data); }
  adminUpdateVariant(id: number, data: any): Observable<any> { return this.http.put(`${this.API}/variants/${id}`, data); }
  adminDeleteVariant(id: number): Observable<any> { return this.http.delete(`${this.API}/variants/${id}`); }

  // REVIEWS
  adminGetAllReviews(): Observable<any> {
    return this.http.get(`${this.API}/reviews/admin/all`);
  }

  adminDeleteReview(id: number): Observable<any> {
    return this.http.delete(`${this.API}/reviews/${id}`);
  }

  // TAX
  adminGetTaxRates(): Observable<any> { return this.http.get(`${this.API}/tax`); }
  adminCreateTaxRate(data: any): Observable<any> { return this.http.post(`${this.API}/tax`, data); }
  adminUpdateTaxRate(id: number, data: any): Observable<any> { return this.http.put(`${this.API}/tax/${id}`, data); }
  adminDeleteTaxRate(id: number): Observable<any> { return this.http.delete(`${this.API}/tax/${id}`); }

  // SHIPPING
  adminGetShippingZones(): Observable<any> { return this.http.get(`${this.API}/shipping/zones`); }
  adminCreateShippingZone(data: any): Observable<any> { return this.http.post(`${this.API}/shipping/zones`, data); }
  adminUpdateShippingZone(id: number, data: any): Observable<any> { return this.http.put(`${this.API}/shipping/zones/${id}`, data); }
  adminDeleteShippingZone(id: number): Observable<any> { return this.http.delete(`${this.API}/shipping/zones/${id}`); }
}
