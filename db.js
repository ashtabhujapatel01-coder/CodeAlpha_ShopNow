/**
 * db.js – Pure-JS database layer using lowdb (JSON file store)
 * No native compilation needed.
 */
const low      = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const lodashId = require('lodash-id');
const path     = require('path');

// ─── Collections ─────────────────────────────────────────────────────────────
function makeDb(filename) {
  const adapter = new FileSync(path.join(__dirname, 'data', filename));
  const db = low(adapter);
  db._.mixin(lodashId);
  return db;
}

const usersDb      = makeDb('users.json');
const productsDb   = makeDb('products.json');
const categoriesDb = makeDb('categories.json');
const ordersDb     = makeDb('orders.json');
const orderItemsDb = makeDb('order_items.json');
const reviewsDb    = makeDb('reviews.json');

// ─── Init defaults ────────────────────────────────────────────────────────────
usersDb.defaults({ users: [] }).write();
productsDb.defaults({ products: [] }).write();
categoriesDb.defaults({ categories: [] }).write();
ordersDb.defaults({ orders: [] }).write();
orderItemsDb.defaults({ order_items: [] }).write();
reviewsDb.defaults({ reviews: [] }).write();

// ─── Counters (auto-increment IDs) ────────────────────────────────────────────
function nextId(db, collection) {
  const items = db.get(collection).value();
  if (!items.length) return 1;
  return Math.max(...items.map(i => i.id)) + 1;
}

function now() { return new Date().toISOString(); }

// ─── Users ────────────────────────────────────────────────────────────────────
const Users = {
  findByEmail(email) {
    return usersDb.get('users').find(u => u.email.toLowerCase() === email.toLowerCase()).value();
  },
  findById(id) {
    return usersDb.get('users').find({ id }).value();
  },
  create({ name, email, password, is_admin = false }) {
    const user = { id: nextId(usersDb, 'users'), name, email, password, is_admin, created_at: now() };
    usersDb.get('users').push(user).write();
    return user;
  },
  update(id, fields) {
    usersDb.get('users').find({ id }).assign(fields).write();
  },
};

// ─── Categories ───────────────────────────────────────────────────────────────
const Categories = {
  all() { return categoriesDb.get('categories').value(); },
  findByName(name) { return categoriesDb.get('categories').find({ name }).value(); },
  create(name) {
    const cat = { id: nextId(categoriesDb, 'categories'), name };
    categoriesDb.get('categories').push(cat).write();
    return cat;
  },
  findById(id) { return categoriesDb.get('categories').find({ id }).value(); },
};

// ─── Products ─────────────────────────────────────────────────────────────────
const Products = {
  all() { return productsDb.get('products').value(); },
  findById(id) { return productsDb.get('products').find({ id }).value(); },
  create(fields) {
    const p = {
      id: nextId(productsDb, 'products'),
      name: fields.name,
      description: fields.description,
      price: parseFloat(fields.price),
      stock: parseInt(fields.stock) || 0,
      image_url: fields.image_url || '/images/placeholder.svg',
      category_id: fields.category_id || null,
      rating: fields.rating || 0,
      reviews_count: fields.reviews_count || 0,
      created_at: now(),
    };
    productsDb.get('products').push(p).write();
    return p;
  },
  update(id, fields) {
    productsDb.get('products').find({ id }).assign(fields).write();
  },
  delete(id) {
    productsDb.get('products').remove({ id }).write();
  },
  search({ search, category_id, sort, page = 1, limit = 12 }) {
    let items = productsDb.get('products').value();

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    if (category_id) {
      items = items.filter(p => p.category_id === category_id);
    }
    if (sort === 'price_asc')  items.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
    else if (sort === 'rating')     items.sort((a, b) => b.rating - a.rating);
    else if (sort === 'popular')    items.sort((a, b) => b.reviews_count - a.reviews_count);
    else items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = items.length;
    const offset = (page - 1) * limit;
    const paged = items.slice(offset, offset + limit);
    return { items: paged, total, pages: Math.ceil(total / limit) };
  },
};

// ─── Orders ───────────────────────────────────────────────────────────────────
const Orders = {
  create({ user_id, total, address, payment_method }) {
    const order = { id: nextId(ordersDb, 'orders'), user_id, status: 'pending', total, address, payment_method, created_at: now() };
    ordersDb.get('orders').push(order).write();
    return order;
  },
  forUser(user_id) {
    return ordersDb.get('orders').filter({ user_id }).value().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  findById(id) { return ordersDb.get('orders').find({ id }).value(); },
  all() { return ordersDb.get('orders').value().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); },
  updateStatus(id, status) { ordersDb.get('orders').find({ id }).assign({ status }).write(); },
};

// ─── Order Items ──────────────────────────────────────────────────────────────
const OrderItems = {
  create({ order_id, product_id, quantity, price }) {
    const item = { id: nextId(orderItemsDb, 'order_items'), order_id, product_id, quantity, price };
    orderItemsDb.get('order_items').push(item).write();
    return item;
  },
  forOrder(order_id) { return orderItemsDb.get('order_items').filter({ order_id }).value(); },
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
const Reviews = {
  create({ product_id, user_id, rating, comment }) {
    const existing = reviewsDb.get('reviews').find({ product_id, user_id }).value();
    if (existing) throw new Error('You have already reviewed this product.');
    const r = { id: nextId(reviewsDb, 'reviews'), product_id, user_id, rating, comment: comment || '', created_at: now() };
    reviewsDb.get('reviews').push(r).write();
    return r;
  },
  forProduct(product_id) {
    return reviewsDb.get('reviews').filter({ product_id }).value().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  avgForProduct(product_id) {
    const reviews = reviewsDb.get('reviews').filter({ product_id }).value();
    if (!reviews.length) return { avg: 0, count: 0 };
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    return { avg: Math.round(avg * 10) / 10, count: reviews.length };
  },
};

module.exports = { Users, Categories, Products, Orders, OrderItems, Reviews };
