import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private readonly API = '/api';

  // PRODUCTS
  getProducts(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get(`${this.API}/products`, { params: httpParams });
  }

  getFeatured(): Observable<any> {
    return this.http.get(`${this.API}/products/featured`);
  }

  getProduct(idOrSlug: string | number): Observable<any> {
    return this.http.get(`${this.API}/products/${idOrSlug}`);
  }

  // CATEGORIES
  getCategories(): Observable<any> {
    return this.http.get(`${this.API}/categories`);
  }

  // ORDERS
  createGuestOrder(data: any): Observable<any> {
    return this.http.post(`${this.API}/orders/guest`, data);
  }

  getOrderGuest(id: number, phone: string): Observable<any> {
    const params = new HttpParams().set('phone', phone);
    return this.http.get(`${this.API}/orders/guest/${id}`, { params });
  }

  validateCoupon(code: string): Observable<any> {
    return this.http.post(`${this.API}/orders/coupon/validate`, { code });
  }

  // REVIEWS
  addReview(data: { product_id: number; rating: number; comment: string; name?: string }): Observable<any> {
    return this.http.post(`${this.API}/reviews`, data);
  }

  getProductReviews(productId: number): Observable<any> {
    return this.http.get(`${this.API}/reviews/product/${productId}`);
  }

  // SETTINGS
  getSettings(): Observable<any> {
    return this.http.get(`${this.API}/settings`);
  }

  // CONTACT
  sendContact(data: { name: string; email: string; subject: string; message: string }): Observable<any> {
    return this.http.post(`${this.API}/contact`, data);
  }

  // SHIPPING
  calculateShipping(amount: number, country?: string): Observable<any> {
    let params = new HttpParams().set('amount', String(amount));
    if (country) params = params.set('country', country);
    return this.http.get(`${this.API}/shipping/calculate`, { params });
  }

  // TAX
  calculateTax(amount: number, country?: string): Observable<any> {
    let params = new HttpParams().set('amount', String(amount));
    if (country) params = params.set('country', country);
    return this.http.get(`${this.API}/tax/calculate`, { params });
  }
}
