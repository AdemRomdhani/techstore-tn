import { Injectable, signal, computed } from '@angular/core';
import { ToastService } from './toast.service';

export interface CartItem {
  product_id: number;
  name: string;
  slug: string;
  price: number;
  old_price?: number;
  image: string;
  stock: number;
  brand?: string;
  quantity: number;
}

const CART_KEY = 'tech_store_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private toast;

  items = signal<CartItem[]>(this.loadFromStorage());
  itemCount = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  cartTotal = computed(() => this.items().reduce((sum, i) => sum + i.price * i.quantity, 0));
  hasItems = computed(() => this.items().length > 0);

  constructor(private toastService: ToastService) {
    this.toast = toastService;
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(items: CartItem[]): void {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    this.items.set([...items]);
  }

  add(product: any, quantity = 1): void {
    const items = this.loadFromStorage();
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      existing.quantity += quantity;
      if (existing.quantity > product.stock) {
        existing.quantity = product.stock;
        this.toast.show('Quantité maximale atteinte', 'warning');
      }
    } else {
      items.push({
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        old_price: product.old_price,
        image: product.image,
        stock: product.stock,
        brand: product.brand,
        quantity,
      });
    }
    this.saveToStorage(items);
    this.toast.show('Ajouté au panier !', 'success');
  }

  updateQuantity(productId: number, quantity: number): void {
    const items = this.loadFromStorage();
    const item = items.find(i => i.product_id === productId);
    if (item) {
      if (quantity <= 0) {
        this.remove(productId);
        return;
      }
      item.quantity = Math.min(quantity, item.stock);
    }
    this.saveToStorage(items);
  }

  remove(productId: number): void {
    const items = this.loadFromStorage().filter(i => i.product_id !== productId);
    this.saveToStorage(items);
    this.toast.show('Article retiré', 'success');
  }

  clear(): void {
    this.saveToStorage([]);
    this.toast.show('Panier vidé', 'success');
  }

  getItems(): CartItem[] {
    return this.loadFromStorage();
  }

  getTotal(): number {
    const items = this.loadFromStorage();
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return +subtotal.toFixed(2);
  }

  reset(): void {
    this.saveToStorage([]);
  }
}
