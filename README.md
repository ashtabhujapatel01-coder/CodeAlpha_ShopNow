# 🛒 ShopNow – Full-Stack E-Commerce App

A complete e-commerce web application built with **Express.js (Node.js)** backend and **Vanilla JS / HTML / CSS** frontend.

## Features

- **Product Listings** – Grid view with search, category filter, and sort
- **Product Detail Page** – Full description, star ratings, reviews
- **Shopping Cart** – Add/remove items, quantity control, live totals
- **Checkout** – Address form + payment method selection (COD, UPI, Card)
- **Order Processing** – Real order placement with stock deduction
- **User Authentication** – Register, Login, Logout with session management
- **My Orders** – Order history with status tracking
- **Admin Panel** – Manage orders and view product inventory
- **SQLite Database** – Persistent storage for products, users, orders

## Tech Stack

| Layer    | Technology               |
|----------|--------------------------|
| Frontend | HTML5, CSS3, Vanilla JS (SPA) |
| Backend  | Node.js + Express.js     |
| Database | SQLite (via better-sqlite3) |
| Auth     | bcryptjs + express-session |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Seed the database (creates 12 sample products + admin user)
npm run seed

# 3. Start the server
npm start
```

Open **http://localhost:3000** in your browser.

## Project Structure

```
ECommerce/
├── server.js          # Express server + all API routes
├── db.js              # SQLite setup + schema
├── seed.js            # Sample data seeder
├── package.json
└── public/
    ├── index.html     # SPA entry point
    ├── css/style.css  # Complete styles
    ├── js/app.js      # SPA router + all pages
    └── images/        # Static assets
```

## API Endpoints

| Method | Endpoint                   | Description            |
|--------|----------------------------|------------------------|
| POST   | /api/auth/register         | Register user          |
| POST   | /api/auth/login            | Login                  |
| POST   | /api/auth/logout           | Logout                 |
| GET    | /api/products              | List products          |
| GET    | /api/products/:id          | Product details        |
| POST   | /api/cart                  | Add/update cart item   |
| GET    | /api/cart                  | View cart              |
| POST   | /api/orders                | Place order            |
| GET    | /api/orders                | My orders              |
| PATCH  | /api/admin/orders/:id      | Update order status    |
