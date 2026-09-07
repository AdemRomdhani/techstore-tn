import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
      { path: 'products', loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent) },
      { path: 'products/:slug', loadComponent: () => import('./features/product-detail/product-detail.component').then(m => m.ProductDetailComponent) },
      { path: 'category/:slug', loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent) },
      { path: 'cart', loadComponent: () => import('./features/cart/cart.component').then(m => m.CartComponent) },
      { path: 'checkout', loadComponent: () => import('./features/checkout/checkout.component').then(m => m.CheckoutComponent) },
      { path: 'order/:id', loadComponent: () => import('./features/orders/order-detail.component').then(m => m.OrderDetailComponent) },
      { path: 'commande/:id', loadComponent: () => import('./features/orders/order-detail.component').then(m => m.OrderDetailComponent) },
      { path: 'about', loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent) },
      { path: 'contact', loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent) },
      { path: 'not-found', loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent) },
    ],
  },
  { path: '**', redirectTo: 'not-found' },
];
