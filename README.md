# 🛍️ Tech Store — Full-Stack E-Commerce Platform

A complete, production-ready e-commerce application with Angular 17 frontend, Node.js/Express backend, and SQLite database. Modern UI, full feature set, ready to run.

## ✨ Features

### 🛒 Storefront
- **Beautiful home page** with hero banner, featured products, categories, promotional banners
- **Product catalog** with search, filters (category, price, sort, featured), pagination
- **Product detail** with image, description, reviews, ratings, related products, stock management
- **Shopping cart** with quantity management, totals, free shipping calculator
- **Wishlist** to save products for later
- **Checkout** with shipping form, multiple payment methods, coupon codes
- **Order history** with status tracking and detailed order view
- **User profile** with editable info and password change
- **Reviews & ratings** (verified purchasers)
- **Responsive design** — works on mobile, tablet, desktop

### 🔐 Authentication
- JWT-based authentication
- Register, login, logout
- Protected routes (auth guard, admin guard)
- Role-based access (customer / admin)

### 👨‍💼 Admin Dashboard
- **Stats overview** — revenue, orders, customers, products, low stock alerts
- **Recent orders** and **top products**
- **Product management** — create, edit, delete products
- **Order management** — view all orders, update status
- **User management** — view users, delete accounts

### 💳 E-Commerce Features
- **Coupons** — WELCOME10, SAVE20, VIP30 (try them!)
- **Free shipping** on orders over $50
- **Stock management** — auto-decrement on order
- **Multiple payment methods** — Card, PayPal, COD
- **Search & filter** — by keyword, category, price, sort
- **Pagination** — efficient large catalog handling

## 🛠️ Tech Stack

| Layer    | Technology                                |
|----------|-------------------------------------------|
| Frontend | Angular 17 (standalone components, signals) |
| UI       | Bootstrap 5, Bootstrap Icons              |
| Backend  | Node.js, Express                          |
| Database | SQLite (better-sqlite3)                   |
| Auth     | JWT + bcrypt                              |
| API      | RESTful with HTTP interceptors            |

## 📁 Project Structure

```
ecommerce-app/
├── backend/                      # Node.js + Express API
│   ├── server.js                 # Main entry
│   ├── package.json
│   ├── .env.example
│   ├── db/
│   │   ├── database.js           # Schema + setup
│   │   └── seed.js               # Sample data
│   ├── routes/
│   │   ├── auth.js               # Register, login, profile
│   │   ├── products.js           # CRUD + search + filter
│   │   ├── categories.js
│   │   ├── cart.js
│   │   ├── wishlist.js
│   │   ├── orders.js             # Checkout, history
│   │   ├── reviews.js
│   │   ├── users.js              # Admin user mgmt
│   │   └── settings.js
│   └── middleware/
│       ├── auth.js               # JWT middleware
│       └── upload.js             # File upload
│
└── frontend/                     # Angular 17 app
    ├── package.json
    ├── angular.json
    ├── tsconfig.json
    ├── proxy.conf.json           # /api -> :3000
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.css
        ├── environments/
        └── app/
            ├── app.component.ts
            ├── app.config.ts
            ├── app.routes.ts
            ├── core/
            │   ├── models/       # TypeScript interfaces
            │   ├── services/     # API, cart, toast
            │   ├── guards/       # auth, admin
            │   └── interceptors/ # auth, error
            ├── shared/
            │   └── components/   # product-card, toast, spinner
            ├── layouts/
            │   ├── main-layout/  # Storefront header+footer
            │   └── admin-layout/ # Admin sidebar
            └── features/
                ├── home/
                ├── products/
                ├── product-detail/
                ├── cart/
                ├── checkout/
                ├── auth/         # login, register
                ├── profile/
                ├── orders/
                ├── wishlist/
                ├── about/
                ├── contact/
                ├── not-found/
                └── admin/        # dashboard, products, orders, users
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and **npm** — [Download](https://nodejs.org)

### 1. Install Backend

```bash
cd backend
npm install
cp .env.example .env       # (optional) edit .env for your settings
npm run seed               # create DB + sample data
npm start                  # API on http://localhost:3000
```

### 2. Install Frontend (new terminal)

```bash
cd frontend
npm install
npm start                  # App on http://localhost:4200
```

### 3. Open the app

Visit **http://localhost:4200** in your browser.

## 🔑 Default Login Credentials

| Role     | Email              | Password   |
|----------|-------------------|-----------|
| Admin    | admin@shop.com    | admin123  |
| Customer | john@shop.com     | user123   |
| Customer | jane@shop.com     | user123   |

## 🎟️ Test Coupon Codes

| Code      | Discount |
|-----------|----------|
| WELCOME10 | 10% off  |
| SAVE20    | 20% off  |
| VIP30     | 30% off  |

## 📡 API Endpoints (Backend)

| Method | Endpoint                       | Description              | Auth |
|--------|--------------------------------|--------------------------|------|
| POST   | /api/auth/register             | Register new user        | -    |
| POST   | /api/auth/login                | Login                    | -    |
| GET    | /api/auth/me                   | Get current user         | ✓    |
| PUT    | /api/auth/me                   | Update profile           | ✓    |
| GET    | /api/products                  | List products (filters)  | -    |
| GET    | /api/products/featured         | Featured products        | -    |
| GET    | /api/products/:id              | Product by id/slug       | -    |
| POST   | /api/products                  | Create product           | admin|
| PUT    | /api/products/:id              | Update product           | admin|
| DELETE | /api/products/:id              | Delete product           | admin|
| GET    | /api/categories                | List categories          | -    |
| GET    | /api/cart                      | Get cart                 | ✓    |
| POST   | /api/cart                      | Add to cart              | ✓    |
| PUT    | /api/cart/:id                  | Update quantity          | ✓    |
| DELETE | /api/cart/:id                  | Remove item              | ✓    |
| GET    | /api/wishlist                  | Get wishlist             | ✓    |
| POST   | /api/wishlist                  | Add to wishlist          | ✓    |
| DELETE | /api/wishlist/:productId       | Remove                   | ✓    |
| POST   | /api/orders                    | Create order (checkout)  | ✓    |
| GET    | /api/orders                    | User's orders            | ✓    |
| GET    | /api/orders/:id                | Order detail             | ✓    |
| POST   | /api/orders/coupon/validate    | Validate coupon          | -    |
| POST   | /api/reviews                   | Add review               | ✓    |
| GET    | /api/reviews/product/:id       | Product reviews          | -    |
| GET    | /api/users                     | List users               | admin|
| GET    | /api/users/admin/stats         | Dashboard stats          | admin|
| GET    | /api/settings                  | Get settings             | -    |

## 🎨 Customization

### Branding
- Edit `frontend/src/app/layouts/main-layout/main-layout.component.ts` — change logo colors
- Edit `frontend/src/styles.css` — change CSS variables (`--primary`, `--secondary`, etc.)
- Edit `frontend/src/index.html` — change site title, favicon

### Products
- Run `npm run seed` in backend to reset sample data
- Or add products via Admin Panel → Products

### Backend Port
- Edit `backend/.env`: `PORT=3000`
- Update `frontend/proxy.conf.json` if changed

## 🔧 Development

### Backend Development Mode (auto-reload)
```bash
cd backend
npm run dev
```

### Frontend Production Build
```bash
cd frontend
npm run build
# Output: dist/tech-store/
```

## 🐛 Troubleshooting

**Port 3000 already in use:** Change `PORT` in `backend/.env`

**CORS errors:** Backend already allows all origins. If you serve frontend separately, set `CORS_ORIGIN` in `.env`

**Database errors:** Delete `backend/data/ecommerce.db` and run `npm run seed` again

**Angular build errors:** Clear cache with `rm -rf node_modules/.cache && npm install`

## 📝 License

MIT — free to use, modify, and distribute.

---

Built with ❤️ using Angular + Node.js + SQLite
