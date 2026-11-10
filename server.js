const express      = require('express');
const session      = require('express-session');
const FileStore    = require('session-file-store')(session);
const bcrypt       = require('bcryptjs');
const path         = require('path');

const { Users, Categories, Products, Orders, OrderItems, Reviews } = require('./db');
const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new FileStore({ path: path.join(__dirname, 'data', 'sessions'), ttl: 86400 * 7, retries: 0 }),
  secret: 'shopnow-super-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// ─── Auth Guards ─────────────────────────────────────────────────────────────
const requireAuth  = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in to continue.' });
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.userId || !req.session.isAdmin)
    return res.status(403).json({ error: 'Admin access required.' });
  next();
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function withCategory(product) {
  if (!product) return null;
  const cat = Categories.findById(product.category_id);
  return { ...product, category: cat ? cat.name : null };
}

function withItems(order) {
  const rawItems = OrderItems.forOrder(order.id);
  const items = rawItems.map(item => {
    const product = Products.findById(item.product_id);
    return { ...item, name: product?.name || 'Deleted product', image_url: product?.image_url || '/images/placeholder.svg' };
  });
  return { ...order, items };
}

function withUser(order) {
  const user = Users.findById(order.user_id);
  return { ...order, user_name: user?.name || 'Unknown', user_email: user?.email || '' };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  if (Users.findByEmail(email))
    return res.status(409).json({ error: 'Email already registered.' });

  const user = Users.create({ name, email, password: bcrypt.hashSync(password, 10) });
  req.session.userId  = user.id;
  req.session.name    = user.name;
  req.session.isAdmin = false;
  res.json({ message: 'Registration successful.', user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  const user = Users.findByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password.' });

  req.session.userId  = user.id;
  req.session.name    = user.name;
  req.session.isAdmin = !!user.is_admin;
  res.json({ message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email, isAdmin: !!user.is_admin } });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out successfully.' }));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = Users.findById(req.session.userId);
  if (!user) return res.json({ user: null });
  res.json({ user: { id: user.id, name: user.name, email: user.email, isAdmin: !!user.is_admin } });
});

app.put('/api/auth/profile', requireAuth, (req, res) => {
  const { name, password } = req.body;
  const updates = {};
  if (name) { updates.name = name; req.session.name = name; }
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    updates.password = bcrypt.hashSync(password, 10);
  }
  Users.update(req.session.userId, updates);
  res.json({ message: 'Profile updated.' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/products', (req, res) => {
  const { search, category, sort, page = 1, limit = 12 } = req.query;

  let category_id = null;
  if (category) {
    const cat = Categories.findByName(category);
    if (cat) category_id = cat.id;
  }

  const { items, total, pages } = Products.search({
    search, category_id, sort, page: parseInt(page), limit: parseInt(limit),
  });

  const products = items.map(withCategory);
  res.json({ products, total, page: parseInt(page), pages });
});

app.get('/api/products/:id', (req, res) => {
  const product = Products.findById(parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const reviews = Reviews.forProduct(product.id).map(r => {
    const user = Users.findById(r.user_id);
    return { ...r, user_name: user?.name || 'Anonymous' };
  });

  res.json({ product: withCategory(product), reviews });
});

app.get('/api/categories', (req, res) => {
  res.json({ categories: Categories.all() });
});

app.post('/api/products/:id/reviews', requireAuth, (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });

  try {
    Reviews.create({ product_id: parseInt(req.params.id), user_id: req.session.userId, rating: parseInt(rating), comment });
    const { avg, count } = Reviews.avgForProduct(parseInt(req.params.id));
    Products.update(parseInt(req.params.id), { rating: avg, reviews_count: count });
    res.json({ message: 'Review added.' });
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

// Admin CRUD
app.post('/api/products', requireAdmin, (req, res) => {
  const { name, description, price, stock, image_url, category_id } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price are required.' });
  const p = Products.create({ name, description, price, stock, image_url, category_id: category_id ? parseInt(category_id) : null });
  res.status(201).json({ message: 'Product created.', id: p.id });
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const { name, description, price, stock, image_url, category_id } = req.body;
  Products.update(parseInt(req.params.id), { name, description, price: parseFloat(price), stock: parseInt(stock), image_url, category_id: category_id ? parseInt(category_id) : null });
  res.json({ message: 'Product updated.' });
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  Products.delete(parseInt(req.params.id));
  res.json({ message: 'Product deleted.' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CART  (session-stored)
// ═══════════════════════════════════════════════════════════════════════════════

function getCart(req) { return req.session.cart || {}; }

app.get('/api/cart', (req, res) => {
  const cart = getCart(req);
  const ids  = Object.keys(cart).map(Number);
  if (!ids.length) return res.json({ items: [], subtotal: 0 });

  const items = ids.map(id => {
    const p = Products.findById(id);
    if (!p) return null;
    const quantity = cart[id];
    return { ...p, quantity, lineTotal: p.price * quantity };
  }).filter(Boolean);

  res.json({ items, subtotal: items.reduce((s, i) => s + i.lineTotal, 0) });
});

app.post('/api/cart', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required.' });

  const product = Products.findById(parseInt(productId));
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const cart = getCart(req);
  const qty  = Math.max(0, Math.min(parseInt(quantity), product.stock));

  if (qty === 0) delete cart[productId];
  else cart[productId] = qty;

  req.session.cart = cart;
  res.json({ message: 'Cart updated.', cart });
});

app.delete('/api/cart/:productId', (req, res) => {
  const cart = getCart(req);
  delete cart[req.params.productId];
  req.session.cart = cart;
  res.json({ message: 'Item removed.' });
});

app.delete('/api/cart', (req, res) => {
  req.session.cart = {};
  res.json({ message: 'Cart cleared.' });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/orders', requireAuth, (req, res) => {
  const { address, payment_method = 'cod' } = req.body;
  if (!address) return res.status(400).json({ error: 'Delivery address is required.' });

  const cart = getCart(req);
  const ids  = Object.keys(cart).map(Number);
  if (!ids.length) return res.status(400).json({ error: 'Your cart is empty.' });

  const products = ids.map(id => Products.findById(id)).filter(Boolean);

  for (const p of products) {
    if (p.stock < cart[p.id]) return res.status(400).json({ error: `Insufficient stock for "${p.name}".` });
  }

  const total = products.reduce((s, p) => s + p.price * cart[p.id], 0);
  const order = Orders.create({ user_id: req.session.userId, total, address, payment_method });

  products.forEach(p => {
    OrderItems.create({ order_id: order.id, product_id: p.id, quantity: cart[p.id], price: p.price });
    Products.update(p.id, { stock: p.stock - cart[p.id] });
  });

  req.session.cart = {};
  res.status(201).json({ message: 'Order placed successfully.', orderId: order.id });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const orders = Orders.forUser(req.session.userId).map(withItems);
  res.json({ orders });
});

app.get('/api/orders/:id', requireAuth, (req, res) => {
  const order = Orders.findById(parseInt(req.params.id));
  if (!order || order.user_id !== req.session.userId)
    return res.status(404).json({ error: 'Order not found.' });
  res.json({ order: withItems(order) });
});

// Admin
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = Orders.all().map(o => withUser(withItems(o)));
  res.json({ orders });
});

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  Orders.updateStatus(parseInt(req.params.id), status);
  res.json({ message: 'Order status updated.' });
});

// ─── SPA catch-all ───────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🛒  ShopNow running at http://localhost:${PORT}`);
  console.log('    Admin: admin@shop.com / admin123\n');
});
