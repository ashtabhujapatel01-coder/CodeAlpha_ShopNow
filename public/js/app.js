/* ───────────────────────────────────────────────────────────────────────────
   ShopNow – Single Page Application (Vanilla JS)
   ─────────────────────────────────────────────────────────────────────────── */

// ─── Global State ────────────────────────────────────────────────────────────
const State = {
  user:       null,
  cart:       { items: [], subtotal: 0 },
  categories: [],
};

// ─── API Helper ───────────────────────────────────────────────────────────────
async function api(method, url, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(message, type = 'info') {
  const el = document.getElementById('toast');
  el.className = `toast ${type} show`;
  el.innerHTML = `<i class="fa ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : type === 'warn' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i> ${message}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ─── Router ───────────────────────────────────────────────────────────────────
const routes = {
  '/':          renderHome,
  '/product':   renderProduct,   // /product?id=X
  '/cart':      renderCart,
  '/checkout':  renderCheckout,
  '/login':     renderLogin,
  '/register':  renderRegister,
  '/orders':    renderOrders,
  '/order':     renderOrderDetail, // /order?id=X
  '/profile':   renderProfile,
  '/admin':     renderAdmin,
};

function navigate(path) {
  history.pushState({}, '', path);
  route();
}

function route() {
  const path = window.location.pathname;
  const handler = routes[path] || render404;
  document.getElementById('app').innerHTML = '';
  handler();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('popstate', route);

document.addEventListener('click', e => {
  const link = e.target.closest('[data-link]');
  if (link) {
    e.preventDefault();
    navigate(link.getAttribute('data-link'));
  }
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function init() {
  await Promise.all([fetchUser(), fetchCart(), fetchCategories()]);
  renderNav();
  route();
}

async function fetchUser() {
  try {
    const d = await api('GET', '/api/auth/me');
    State.user = d.user;
  } catch { State.user = null; }
}

async function fetchCart() {
  try {
    State.cart = await api('GET', '/api/cart');
  } catch { State.cart = { items: [], subtotal: 0 }; }
}

async function fetchCategories() {
  try {
    const d = await api('GET', '/api/categories');
    State.categories = d.categories;
  } catch {}
}

function updateCartBadge() {
  const count = State.cart.items.reduce((s, i) => s + i.quantity, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = count;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function renderNav() {
  updateCartBadge();

  const navUser = document.getElementById('navUser');
  if (State.user) {
    const initials = State.user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    navUser.innerHTML = `
      <div class="user-dropdown">
        <button class="user-btn" id="userBtn">
          <span class="avatar">${initials}</span>
          ${State.user.name.split(' ')[0]}
          <i class="fa fa-chevron-down" style="font-size:.7rem"></i>
        </button>
        <div class="dropdown-menu" id="dropMenu">
          <a href="/orders" data-link="/orders"><i class="fa fa-box"></i> My Orders</a>
          <a href="/profile" data-link="/profile"><i class="fa fa-user"></i> Profile</a>
          ${State.user.isAdmin ? `<a href="/admin" data-link="/admin"><i class="fa fa-cog"></i> Admin Panel</a>` : ''}
          <div class="sep"></div>
          <button id="logoutBtn"><i class="fa fa-sign-out-alt"></i> Logout</button>
        </div>
      </div>`;

    document.getElementById('userBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('dropMenu').classList.toggle('open');
    });
    document.addEventListener('click', () => {
      document.getElementById('dropMenu')?.classList.remove('open');
    }, { once: false });
    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    navUser.innerHTML = `
      <a class="btn btn-outline btn-sm" href="/login" data-link="/login">Login</a>
      <a class="btn btn-primary btn-sm" href="/register" data-link="/register">Register</a>`;
  }

  // Search
  const searchBtn   = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const doSearch = () => {
    const q = searchInput.value.trim();
    if (q) navigate(`/?search=${encodeURIComponent(q)}`);
  };
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => e.key === 'Enter' && doSearch());
}

async function logout() {
  await api('POST', '/api/auth/logout');
  State.user = null;
  State.cart = { items: [], subtotal: 0 };
  renderNav();
  toast('Logged out successfully.', 'info');
  navigate('/');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function starsHTML(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return `${'<i class="fa fa-star"></i>'.repeat(full)}${'<i class="fa fa-star-half-alt"></i>'.repeat(half)}${'<i class="far fa-star"></i>'.repeat(empty)}`;
}

function statusBadge(status) {
  const map = { pending: 'warn', processing: 'info', shipped: 'info', delivered: 'success', cancelled: 'danger' };
  return `<span class="badge-pill badge-${map[status] || 'muted'}">${status}</span>`;
}

function loader() {
  return `<div class="loader-wrap"><div class="spinner"></div></div>`;
}

function setHTML(html) { document.getElementById('app').innerHTML = html; }

function relativeDate(str) {
  const d = new Date(str);
  const diff = Date.now() - d.getTime();
  if (diff < 60000)   return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)return `${Math.floor(diff/3600000)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
async function renderHome() {
  const params = new URLSearchParams(window.location.search);
  const search   = params.get('search')   || '';
  const category = params.get('category') || '';
  const sort     = params.get('sort')     || '';
  const page     = parseInt(params.get('page') || '1');

  setHTML(loader());

  try {
    const qs = new URLSearchParams({ page, limit: 12 });
    if (search)   qs.set('search', search);
    if (category) qs.set('category', category);
    if (sort)     qs.set('sort', sort);

    const data = await api('GET', `/api/products?${qs}`);
    const { products, total, pages } = data;

    // Filter bar
    const catChips = State.categories.map(c => `
      <button class="cat-chip ${c.name === category ? 'active' : ''}" data-cat="${c.name}">${c.name}</button>
    `).join('');

    // Products
    const productCards = products.length
      ? products.map(productCard).join('')
      : `<div class="empty-state" style="grid-column:1/-1">
           <i class="fa fa-search"></i>
           <h2>No products found</h2>
           <p>Try adjusting your filters or search term.</p>
           <button class="btn btn-primary" onclick="navigate('/')">Clear filters</button>
         </div>`;

    // Pagination
    const pagination = pages > 1 ? `
      <div class="pagination">
        <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goPage(${page - 1})">
          <i class="fa fa-chevron-left"></i>
        </button>
        ${Array.from({ length: pages }, (_, i) => i + 1).map(p =>
          `<button class="page-btn ${p === page ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`
        ).join('')}
        <button class="page-btn" ${page >= pages ? 'disabled' : ''} onclick="goPage(${page + 1})">
          <i class="fa fa-chevron-right"></i>
        </button>
      </div>
    ` : '';

    const heroHTML = !search && !category ? `
      <div class="hero">
        <h1>🛍️ Shop Smarter, Live Better</h1>
        <p>Discover thousands of products at unbeatable prices, delivered to your door.</p>
        <div class="hero-actions">
          <button class="btn-white btn" onclick="document.querySelector('.filter-bar').scrollIntoView({behavior:'smooth'})">
            <i class="fa fa-th-large"></i> Browse All
          </button>
          <a class="btn-ghost btn" href="/cart" data-link="/cart"><i class="fa fa-shopping-cart"></i> View Cart</a>
        </div>
      </div>
    ` : '';

    const titleText = search
      ? `Results for "${search}" <span style="color:var(--muted);font-size:1rem;font-weight:400">(${total} items)</span>`
      : category
      ? `${category} <span style="color:var(--muted);font-size:1rem;font-weight:400">(${total} items)</span>`
      : `All Products <span style="color:var(--muted);font-size:1rem;font-weight:400">(${total} items)</span>`;

    setHTML(`
      ${heroHTML}
      <div class="filter-bar">
        <div class="filter-inner">
          <div class="cats">
            <button class="cat-chip ${!category ? 'active' : ''}" data-cat="">All</button>
            ${catChips}
          </div>
          <select class="sort-select" id="sortSelect">
            <option value="" ${!sort ? 'selected' : ''}>Newest First</option>
            <option value="price_asc"  ${sort === 'price_asc'  ? 'selected' : ''}>Price: Low → High</option>
            <option value="price_desc" ${sort === 'price_desc' ? 'selected' : ''}>Price: High → Low</option>
            <option value="rating"     ${sort === 'rating'     ? 'selected' : ''}>Top Rated</option>
            <option value="popular"    ${sort === 'popular'    ? 'selected' : ''}>Most Popular</option>
          </select>
        </div>
      </div>
      <section class="products-section">
        <h2 class="section-title">${titleText}</h2>
        <div class="products-grid">${productCards}</div>
        ${pagination}
      </section>
    `);

    // Category chips
    document.querySelectorAll('.cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        const p = new URLSearchParams(window.location.search);
        cat ? p.set('category', cat) : p.delete('category');
        p.delete('page');
        navigate('/?' + p.toString());
      });
    });

    // Sort
    document.getElementById('sortSelect').addEventListener('change', e => {
      const p = new URLSearchParams(window.location.search);
      e.target.value ? p.set('sort', e.target.value) : p.delete('sort');
      p.delete('page');
      navigate('/?' + p.toString());
    });

  } catch (err) { setHTML(`<div class="empty-state"><h2>Error loading products</h2><p>${err.message}</p></div>`); }
}

window.goPage = (p) => {
  const params = new URLSearchParams(window.location.search);
  params.set('page', p);
  navigate('/?' + params.toString());
};

function productCard(p) {
  return `
    <div class="product-card">
      <div class="product-img-wrap">
        <img src="${p.image_url}" alt="${p.name}" loading="lazy" onerror="this.src='/images/placeholder.svg'"/>
        ${p.stock < 5 && p.stock > 0 ? '<span class="product-badge">Almost Gone!</span>' : ''}
        ${p.stock === 0 ? '<span class="product-badge" style="background:var(--muted)">Out of Stock</span>' : ''}
      </div>
      <div class="product-info">
        <div class="product-category">${p.category || 'General'}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-stars">
          <span class="stars">${starsHTML(p.rating)}</span>
          <span style="color:var(--muted)">${p.rating} (${p.reviews_count})</span>
        </div>
        <div class="product-price">${formatPrice(p.price)}</div>
      </div>
      <div class="product-actions">
        ${p.stock > 0
          ? `<button class="btn btn-primary btn-sm btn-cart" onclick="addToCart(${p.id}, event)"><i class="fa fa-cart-plus"></i> Add to Cart</button>`
          : `<span class="out-of-stock"><i class="fa fa-times-circle"></i> Out of Stock</span>`
        }
        <button class="btn-view" title="View details" onclick="navigate('/product?id=${p.id}')"><i class="fa fa-eye"></i></button>
      </div>
    </div>`;
}

// ─── PRODUCT DETAIL ───────────────────────────────────────────────────────────
async function renderProduct() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return navigate('/');

  setHTML(loader());

  try {
    const { product: p, reviews } = await api('GET', `/api/products/${id}`);

    setHTML(`
      <div class="product-detail">
        <div style="margin-bottom:16px">
          <button class="btn btn-outline btn-sm" onclick="history.back()"><i class="fa fa-arrow-left"></i> Back</button>
        </div>
        <div class="product-detail-grid">
          <div class="product-detail-img">
            <img src="${p.image_url}" alt="${p.name}" onerror="this.src='/images/placeholder.svg'"/>
          </div>
          <div class="product-detail-info">
            <div class="product-category" style="font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600">${p.category || 'General'}</div>
            <h1>${p.name}</h1>
            <div class="product-stars" style="font-size:.95rem">
              <span class="stars">${starsHTML(p.rating)}</span>
              <span style="color:var(--muted)">${p.rating} · ${p.reviews_count} reviews</span>
            </div>
            <p class="product-detail-desc">${p.description}</p>
            <div class="detail-price">${formatPrice(p.price)}</div>
            <div class="${p.stock === 0 ? 'stock-info out' : p.stock < 10 ? 'stock-info low' : 'stock-info'}">
              ${p.stock === 0 ? '<i class="fa fa-times-circle"></i> Out of stock' : p.stock < 10 ? `<i class="fa fa-exclamation-circle"></i> Only ${p.stock} left!` : `<i class="fa fa-check-circle" style="color:var(--success)"></i> In stock (${p.stock} available)`}
            </div>
            ${p.stock > 0 ? `
            <div class="qty-row">
              <div class="qty-ctrl">
                <button onclick="detailQty(-1)"><i class="fa fa-minus"></i></button>
                <span id="detailQty">1</span>
                <button onclick="detailQty(1)"><i class="fa fa-plus"></i></button>
              </div>
              <button class="btn btn-primary" onclick="addToCartDetail(${p.id}, ${p.stock})">
                <i class="fa fa-shopping-cart"></i> Add to Cart
              </button>
              <button class="btn btn-outline" onclick="buyNow(${p.id})">
                <i class="fa fa-bolt"></i> Buy Now
              </button>
            </div>` : ''}
          </div>
        </div>
      </div>

      <!-- Reviews -->
      <div class="reviews-section">
        <h2 class="section-title">Customer Reviews</h2>
        ${State.user ? `
          <div class="review-form-box">
            <h3 style="margin-bottom:14px">Write a Review</h3>
            <div class="star-select" id="starSelect">
              ${[1,2,3,4,5].map(i => `<i class="fa fa-star" data-val="${i}"></i>`).join('')}
            </div>
            <input type="hidden" id="reviewRating" value="0"/>
            <div class="form-group">
              <textarea id="reviewComment" placeholder="Share your thoughts about this product…" rows="3"></textarea>
            </div>
            <button class="btn btn-primary" onclick="submitReview(${p.id})">Submit Review</button>
          </div>
        ` : `<p style="margin-bottom:24px;color:var(--muted)"><a href="/login" data-link="/login" style="color:var(--primary);font-weight:700">Login</a> to write a review.</p>`}

        <div class="review-list">
          ${reviews.length ? reviews.map(r => `
            <div class="review-item">
              <div class="review-header">
                <div>
                  <div class="review-user">${r.user_name}</div>
                  <div class="stars" style="font-size:.85rem">${starsHTML(r.rating)}</div>
                </div>
                <div class="review-date">${relativeDate(r.created_at)}</div>
              </div>
              ${r.comment ? `<div class="review-comment">${r.comment}</div>` : ''}
            </div>
          `).join('') : `<p style="color:var(--muted)">No reviews yet. Be the first!</p>`}
        </div>
      </div>
    `);

    // Star select
    const stars = document.querySelectorAll('#starSelect i');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.dataset.val);
        document.getElementById('reviewRating').value = val;
        stars.forEach((s, i) => s.classList.toggle('active', i < val));
      });
    });

  } catch (err) {
    setHTML(`<div class="empty-state"><i class="fa fa-exclamation-circle"></i><h2>Product not found</h2><p>${err.message}</p><button class="btn btn-primary" onclick="navigate('/')">Go Home</button></div>`);
  }
}

window.detailQty = function(delta) {
  const el = document.getElementById('detailQty');
  const v = Math.max(1, parseInt(el.textContent) + delta);
  el.textContent = v;
};

window.addToCartDetail = async function(id, stock) {
  const qty = parseInt(document.getElementById('detailQty').textContent);
  if (qty > stock) return toast('Not enough stock!', 'error');
  await addToCartQty(id, qty);
};

window.buyNow = async function(id) {
  if (!State.user) { toast('Please login to continue.', 'warn'); return navigate('/login'); }
  await addToCartQty(id, 1);
  navigate('/cart');
};

window.submitReview = async function(productId) {
  const rating  = parseInt(document.getElementById('reviewRating').value);
  const comment = document.getElementById('reviewComment').value.trim();
  if (!rating) return toast('Please select a star rating.', 'warn');
  try {
    await api('POST', `/api/products/${productId}/reviews`, { rating, comment });
    toast('Review submitted!', 'success');
    renderProduct();
  } catch (err) { toast(err.message, 'error'); }
};

// ─── CART HELPERS ─────────────────────────────────────────────────────────────
window.addToCart = async function(id, e) {
  if (e) { e.stopPropagation(); }
  if (!State.user) { toast('Please login to add items.', 'warn'); navigate('/login'); return; }
  await addToCartQty(id, 1);
};

async function addToCartQty(id, qty) {
  try {
    // find current qty in cart
    const existing = State.cart.items.find(i => i.id === id);
    const newQty   = (existing ? existing.quantity : 0) + qty;
    await api('POST', '/api/cart', { productId: id, quantity: newQty });
    await fetchCart();
    updateCartBadge();
    toast('Added to cart! 🛒', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

// ─── CART PAGE ────────────────────────────────────────────────────────────────
async function renderCart() {
  if (!State.user) { navigate('/login'); return; }
  setHTML(loader());
  await fetchCart();

  if (!State.cart.items.length) {
    setHTML(`
      <div class="cart-page">
        <h1 class="section-title">Shopping Cart</h1>
        <div class="empty-cart">
          <i class="fa fa-shopping-cart"></i>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything yet.</p>
          <button class="btn btn-primary" onclick="navigate('/')"><i class="fa fa-arrow-left"></i> Continue Shopping</button>
        </div>
      </div>`);
    return;
  }

  const itemsHTML = State.cart.items.map(item => `
    <div class="cart-item" id="cart-item-${item.id}">
      <img class="cart-item-img" src="${item.image_url}" alt="${item.name}" onerror="this.src='/images/placeholder.svg'"/>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price)} each</div>
      </div>
      <div class="cart-item-actions">
        <div class="qty-ctrl">
          <button onclick="updateQty(${item.id}, ${item.quantity - 1})"><i class="fa fa-minus"></i></button>
          <span>${item.quantity}</span>
          <button onclick="updateQty(${item.id}, ${item.quantity + 1})"><i class="fa fa-plus"></i></button>
        </div>
        <button class="btn btn-danger btn-sm" onclick="removeItem(${item.id})"><i class="fa fa-trash"></i></button>
      </div>
      <div class="cart-item-total">${formatPrice(item.lineTotal)}</div>
    </div>
  `).join('');

  const shipping = State.cart.subtotal > 999 ? 0 : 99;
  const total    = State.cart.subtotal + shipping;

  setHTML(`
    <div class="cart-page">
      <h1 class="section-title">Shopping Cart <span style="color:var(--muted);font-size:1rem">(${State.cart.items.length} item${State.cart.items.length > 1 ? 's' : ''})</span></h1>
      <div class="cart-layout">
        <div>
          <div class="cart-items">${itemsHTML}</div>
          <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="navigate('/')"><i class="fa fa-arrow-left"></i> Continue Shopping</button>
            <button class="btn btn-danger btn-sm" onclick="clearCart()"><i class="fa fa-trash"></i> Clear Cart</button>
          </div>
        </div>
        <div class="order-summary">
          <h3><i class="fa fa-receipt"></i> Order Summary</h3>
          <div class="summary-row"><span>Subtotal</span><span>${formatPrice(State.cart.subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--success)">FREE</span>' : formatPrice(shipping)}</span></div>
          ${shipping > 0 ? `<div style="font-size:.8rem;color:var(--muted);margin-top:-8px;padding-bottom:10px">Free shipping on orders over ₹999</div>` : ''}
          <div class="summary-row summary-total"><span>Total</span><span class="amount">${formatPrice(total)}</span></div>
          <button class="btn btn-primary btn-block" style="margin-top:20px" onclick="navigate('/checkout')">
            <i class="fa fa-lock"></i> Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  `);
}

window.updateQty = async function(id, qty) {
  try {
    await api('POST', '/api/cart', { productId: id, quantity: qty });
    await fetchCart();
    updateCartBadge();
    renderCart();
  } catch (err) { toast(err.message, 'error'); }
};

window.removeItem = async function(id) {
  try {
    await api('DELETE', `/api/cart/${id}`);
    await fetchCart();
    updateCartBadge();
    toast('Item removed.', 'info');
    renderCart();
  } catch (err) { toast(err.message, 'error'); }
};

window.clearCart = async function() {
  if (!confirm('Clear all items from cart?')) return;
  await api('DELETE', '/api/cart');
  await fetchCart();
  updateCartBadge();
  renderCart();
};

// ─── CHECKOUT ─────────────────────────────────────────────────────────────────
function renderCheckout() {
  if (!State.user) { navigate('/login'); return; }
  if (!State.cart.items.length) { navigate('/cart'); return; }

  setHTML(`
    <div class="form-page" style="max-width:640px">
      <div class="form-card">
        <div class="checkout-steps">
          <div class="checkout-step active">1. Address</div>
          <div class="checkout-step">2. Payment</div>
          <div class="checkout-step">3. Review</div>
        </div>
        <h1>Delivery Address</h1>
        <p class="subtitle">Where should we send your order?</p>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="coName" value="${State.user.name}" placeholder="Your full name"/>
        </div>
        <div class="form-group">
          <label>Street Address</label>
          <textarea id="coAddress" placeholder="House no., Street, Area…"></textarea>
        </div>
        <div class="form-group">
          <label>City</label>
          <input type="text" id="coCity" placeholder="City"/>
        </div>
        <div class="form-group">
          <label>State</label>
          <input type="text" id="coState" placeholder="State"/>
        </div>
        <div class="form-group">
          <label>PIN Code</label>
          <input type="text" id="coPIN" placeholder="6-digit PIN code" maxlength="6"/>
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" id="coPhone" placeholder="+91 XXXXX XXXXX"/>
        </div>

        <h3 style="margin-bottom:14px">Payment Method</h3>
        <div class="payment-opts">
          <label class="payment-opt selected" id="pay-cod">
            <input type="radio" name="payment" value="cod" checked/>
            <i class="fa fa-money-bill-wave" style="color:var(--success);font-size:1.2rem"></i>
            <div><strong>Cash on Delivery</strong><br><small style="color:var(--muted)">Pay when you receive</small></div>
          </label>
          <label class="payment-opt" id="pay-upi">
            <input type="radio" name="payment" value="upi"/>
            <i class="fa fa-mobile-alt" style="color:var(--primary);font-size:1.2rem"></i>
            <div><strong>UPI / Net Banking</strong><br><small style="color:var(--muted)">Instant payment (simulated)</small></div>
          </label>
          <label class="payment-opt" id="pay-card">
            <input type="radio" name="payment" value="card"/>
            <i class="fa fa-credit-card" style="color:var(--accent);font-size:1.2rem"></i>
            <div><strong>Credit / Debit Card</strong><br><small style="color:var(--muted)">All major cards accepted (simulated)</small></div>
          </label>
        </div>

        <!-- Order Review -->
        <div style="margin-top:24px;background:var(--bg);border-radius:8px;padding:16px">
          <h3 style="margin-bottom:12px">Order Review</h3>
          ${State.cart.items.map(i => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:.9rem">
              <span>${i.name} × ${i.quantity}</span>
              <span style="font-weight:700">${formatPrice(i.lineTotal)}</span>
            </div>
          `).join('')}
          <div style="border-top:1px solid var(--border);margin-top:10px;padding-top:10px;display:flex;justify-content:space-between;font-weight:800">
            <span>Total</span>
            <span style="color:var(--primary)">${formatPrice(State.cart.subtotal + (State.cart.subtotal > 999 ? 0 : 99))}</span>
          </div>
        </div>

        <button class="btn btn-primary btn-block" style="margin-top:24px" onclick="placeOrder()">
          <i class="fa fa-check-circle"></i> Place Order
        </button>
        <button class="btn btn-outline btn-block" style="margin-top:10px" onclick="navigate('/cart')">
          <i class="fa fa-arrow-left"></i> Back to Cart
        </button>
      </div>
    </div>
  `);

  // payment option selection highlight
  document.querySelectorAll('.payment-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

window.placeOrder = async function() {
  const name    = document.getElementById('coName').value.trim();
  const street  = document.getElementById('coAddress').value.trim();
  const city    = document.getElementById('coCity').value.trim();
  const state   = document.getElementById('coState').value.trim();
  const pin     = document.getElementById('coPIN').value.trim();
  const phone   = document.getElementById('coPhone').value.trim();
  const payment = document.querySelector('input[name="payment"]:checked')?.value || 'cod';

  if (!name || !street || !city || !state || !pin || !phone)
    return toast('Please fill in all address fields.', 'warn');
  if (!/^\d{6}$/.test(pin)) return toast('Enter a valid 6-digit PIN code.', 'warn');

  const address = `${name}, ${street}, ${city}, ${state} – ${pin}\nPhone: ${phone}`;

  try {
    const { orderId } = await api('POST', '/api/orders', { address, payment_method: payment });
    await fetchCart();
    updateCartBadge();
    toast('🎉 Order placed successfully!', 'success');
    navigate(`/order?id=${orderId}`);
  } catch (err) { toast(err.message, 'error'); }
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function renderLogin() {
  if (State.user) { navigate('/'); return; }
  setHTML(`
    <div class="form-page">
      <div class="form-card">
        <h1>Welcome back 👋</h1>
        <p class="subtitle">Login to your ShopNow account</p>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="loginEmail" placeholder="you@email.com" autocomplete="email"/>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="loginPass" placeholder="••••••••" autocomplete="current-password"/>
        </div>
        <div id="loginErr" class="form-error"></div>
        <button class="btn btn-primary btn-block" style="margin-top:8px" onclick="doLogin()">
          <i class="fa fa-sign-in-alt"></i> Login
        </button>
        <div class="form-divider">or</div>
        <div class="form-link">Don't have an account? <a href="/register" data-link="/register">Register</a></div>
        <div class="form-link" style="margin-top:8px;font-size:.82rem;color:var(--muted)">Admin demo: admin@shop.com / admin123</div>
      </div>
    </div>
  `);

  document.getElementById('loginPass').addEventListener('keydown', e => e.key === 'Enter' && doLogin());
}

window.doLogin = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  document.getElementById('loginErr').textContent = '';
  if (!email || !pass) { document.getElementById('loginErr').textContent = 'All fields required.'; return; }
  try {
    const d = await api('POST', '/api/auth/login', { email, password: pass });
    State.user = d.user;
    renderNav();
    toast(`Welcome back, ${d.user.name}!`, 'success');
    navigate('/');
  } catch (err) { document.getElementById('loginErr').textContent = err.message; }
};

function renderRegister() {
  if (State.user) { navigate('/'); return; }
  setHTML(`
    <div class="form-page">
      <div class="form-card">
        <h1>Create Account 🚀</h1>
        <p class="subtitle">Join ShopNow and start shopping!</p>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="regName" placeholder="Your full name"/>
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="regEmail" placeholder="you@email.com"/>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="regPass" placeholder="Min. 6 characters"/>
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input type="password" id="regPass2" placeholder="Repeat password"/>
        </div>
        <div id="regErr" class="form-error"></div>
        <button class="btn btn-primary btn-block" style="margin-top:8px" onclick="doRegister()">
          <i class="fa fa-user-plus"></i> Create Account
        </button>
        <div class="form-divider">or</div>
        <div class="form-link">Already have an account? <a href="/login" data-link="/login">Login</a></div>
      </div>
    </div>
  `);
}

window.doRegister = async function() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const errEl = document.getElementById('regErr');
  errEl.textContent = '';

  if (!name || !email || !pass) { errEl.textContent = 'All fields required.'; return; }
  if (pass !== pass2)           { errEl.textContent = 'Passwords do not match.'; return; }
  if (pass.length < 6)         { errEl.textContent = 'Password must be at least 6 characters.'; return; }

  try {
    const d = await api('POST', '/api/auth/register', { name, email, password: pass });
    State.user = d.user;
    renderNav();
    toast('Account created! Welcome to ShopNow 🎉', 'success');
    navigate('/');
  } catch (err) { errEl.textContent = err.message; }
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
async function renderOrders() {
  if (!State.user) { navigate('/login'); return; }
  setHTML(loader());

  try {
    const { orders } = await api('GET', '/api/orders');

    if (!orders.length) {
      setHTML(`
        <div class="orders-page">
          <h1 class="section-title">My Orders</h1>
          <div class="empty-state">
            <i class="fa fa-box-open"></i>
            <h2>No orders yet</h2>
            <p>Start shopping to see your orders here.</p>
            <button class="btn btn-primary" onclick="navigate('/')">Shop Now</button>
          </div>
        </div>`);
      return;
    }

    const cardsHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-header">
          <div>
            <div class="order-id">Order <strong>#${o.id}</strong></div>
            <div style="font-size:.82rem;color:var(--muted);margin-top:4px">${new Date(o.created_at).toLocaleString('en-IN')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            ${statusBadge(o.status)}
            <span style="font-size:.82rem;color:var(--muted)">${o.payment_method.toUpperCase()}</span>
          </div>
        </div>
        <div class="order-items-preview">
          ${o.items.slice(0, 4).map(i => `<img class="order-item-thumb" src="${i.image_url}" alt="${i.name}" title="${i.name}" onerror="this.src='/images/placeholder.svg'"/>`).join('')}
          ${o.items.length > 4 ? `<div class="order-item-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--bg);font-weight:700;color:var(--muted)">+${o.items.length - 4}</div>` : ''}
        </div>
        <div class="order-footer">
          <div class="order-total">${formatPrice(o.total)}</div>
          <button class="btn btn-outline btn-sm" onclick="navigate('/order?id=${o.id}')">View Details <i class="fa fa-arrow-right"></i></button>
        </div>
      </div>
    `).join('');

    setHTML(`
      <div class="orders-page">
        <h1 class="section-title">My Orders <span style="color:var(--muted);font-size:1rem">(${orders.length})</span></h1>
        ${cardsHTML}
      </div>`);
  } catch (err) { setHTML(`<div class="empty-state"><h2>Error</h2><p>${err.message}</p></div>`); }
}

async function renderOrderDetail() {
  if (!State.user) { navigate('/login'); return; }
  const id = new URLSearchParams(window.location.search).get('id');
  setHTML(loader());

  try {
    const { order } = await api('GET', `/api/orders/${id}`);

    setHTML(`
      <div class="orders-page">
        <div style="margin-bottom:16px">
          <button class="btn btn-outline btn-sm" onclick="navigate('/orders')"><i class="fa fa-arrow-left"></i> All Orders</button>
        </div>
        <div class="order-card">
          <div class="order-header">
            <div>
              <h2>Order #${order.id}</h2>
              <div style="font-size:.85rem;color:var(--muted)">${new Date(order.created_at).toLocaleString('en-IN')}</div>
            </div>
            ${statusBadge(order.status)}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;flex-wrap:wrap">
            <div>
              <strong>Delivery Address</strong>
              <p style="color:var(--muted);font-size:.88rem;margin-top:6px;line-height:1.6;white-space:pre-wrap">${order.address}</p>
            </div>
            <div>
              <strong>Payment</strong>
              <p style="color:var(--muted);font-size:.88rem;margin-top:6px">${order.payment_method.toUpperCase()}</p>
            </div>
          </div>

          <div class="order-detail-items">
            ${order.items.map(i => `
              <div class="order-detail-item">
                <img src="${i.image_url}" alt="${i.name}" onerror="this.src='/images/placeholder.svg'"/>
                <div class="order-detail-item-info">
                  <div class="order-detail-item-name">${i.name}</div>
                  <div class="order-detail-item-meta">Qty: ${i.quantity} · ${formatPrice(i.price)} each</div>
                </div>
                <div class="order-detail-item-price">${formatPrice(i.price * i.quantity)}</div>
              </div>
            `).join('')}
          </div>

          <div style="text-align:right;margin-top:16px;font-size:1.2rem;font-weight:800">
            Total: <span style="color:var(--primary)">${formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
    `);
  } catch (err) { setHTML(`<div class="empty-state"><h2>Order not found</h2><p>${err.message}</p></div>`); }
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function renderProfile() {
  if (!State.user) { navigate('/login'); return; }
  setHTML(`
    <div class="profile-page">
      <h1 class="section-title">My Profile</h1>
      <div class="form-card">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px">
          <div style="width:60px;height:60px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800">
            ${State.user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <div>
            <div style="font-size:1.2rem;font-weight:800">${State.user.name}</div>
            <div style="color:var(--muted);font-size:.9rem">${State.user.email}</div>
            ${State.user.isAdmin ? '<span class="badge-pill badge-info" style="margin-top:4px">Admin</span>' : ''}
          </div>
        </div>

        <h3 style="margin-bottom:16px">Update Details</h3>
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="profName" value="${State.user.name}"/>
        </div>
        <div class="form-group">
          <label>New Password <span style="color:var(--muted);font-weight:400;font-size:.82rem">(leave blank to keep current)</span></label>
          <input type="password" id="profPass" placeholder="New password"/>
        </div>
        <div id="profErr" class="form-error"></div>
        <button class="btn btn-primary" onclick="updateProfile()"><i class="fa fa-save"></i> Save Changes</button>
        <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border)">
          <button class="btn btn-outline" onclick="navigate('/orders')"><i class="fa fa-box"></i> View My Orders</button>
        </div>
      </div>
    </div>
  `);
}

window.updateProfile = async function() {
  const name = document.getElementById('profName').value.trim();
  const pass = document.getElementById('profPass').value;
  document.getElementById('profErr').textContent = '';
  try {
    await api('PUT', '/api/auth/profile', { name, password: pass || undefined });
    State.user.name = name || State.user.name;
    renderNav();
    toast('Profile updated!', 'success');
  } catch (err) { document.getElementById('profErr').textContent = err.message; }
};

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
async function renderAdmin() {
  if (!State.user?.isAdmin) { navigate('/'); return; }
  setHTML(loader());

  try {
    const [prodData, orderData] = await Promise.all([
      api('GET', '/api/products?limit=100'),
      api('GET', '/api/admin/orders'),
    ]);

    const { products } = prodData;
    const { orders }   = orderData;

    setHTML(`
      <div class="admin-page">
        <h1 class="section-title"><i class="fa fa-cog"></i> Admin Panel</h1>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:36px">
          ${[
            { icon: 'fa-box', label: 'Products',  val: products.length, color: 'var(--primary)' },
            { icon: 'fa-shopping-bag', label: 'Orders', val: orders.length, color: 'var(--accent)' },
            { icon: 'fa-coins', label: 'Revenue', val: formatPrice(orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)), color: 'var(--success)' },
            { icon: 'fa-clock', label: 'Pending', val: orders.filter(o => o.status === 'pending').length, color: 'var(--warn)' },
          ].map(s => `
            <div style="background:#fff;border-radius:var(--radius);padding:20px;box-shadow:var(--shadow);display:flex;align-items:center;gap:14px">
              <div style="width:48px;height:48px;border-radius:12px;background:${s.color}1a;display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:${s.color}"><i class="fa ${s.icon}"></i></div>
              <div><div style="font-size:1.5rem;font-weight:900">${s.val}</div><div style="color:var(--muted);font-size:.82rem">${s.label}</div></div>
            </div>
          `).join('')}
        </div>

        <!-- Orders -->
        <h2 style="font-size:1.2rem;margin-bottom:16px">Recent Orders</h2>
        <div style="overflow-x:auto;margin-bottom:40px">
          <table class="data-table">
            <thead>
              <tr><th>#</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              ${orders.slice(0, 20).map(o => `
                <tr>
                  <td><strong>#${o.id}</strong></td>
                  <td>${o.user_name}<br><small style="color:var(--muted)">${o.user_email}</small></td>
                  <td><strong>${formatPrice(o.total)}</strong></td>
                  <td><span style="text-transform:uppercase;font-size:.8rem">${o.payment_method}</span></td>
                  <td>${statusBadge(o.status)}</td>
                  <td style="font-size:.82rem;color:var(--muted)">${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  <td>
                    <select style="font-size:.82rem;padding:5px 8px;border:1px solid var(--border);border-radius:6px" onchange="updateOrderStatus(${o.id}, this.value)">
                      ${['pending','processing','shipped','delivered','cancelled'].map(s =>
                        `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
                      ).join('')}
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Products -->
        <h2 style="font-size:1.2rem;margin-bottom:16px">Products</h2>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th>Rating</th></tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>${p.id}</td>
                  <td><strong>${p.name}</strong></td>
                  <td>${formatPrice(p.price)}</td>
                  <td><span class="${p.stock === 0 ? 'badge-pill badge-danger' : p.stock < 10 ? 'badge-pill badge-warn' : 'badge-pill badge-success'}">${p.stock}</span></td>
                  <td>${p.category || '—'}</td>
                  <td><span class="stars" style="font-size:.8rem">${starsHTML(p.rating)}</span> ${p.rating}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `);
  } catch (err) { setHTML(`<div class="empty-state"><h2>Error loading admin panel</h2><p>${err.message}</p></div>`); }
}

window.updateOrderStatus = async function(id, status) {
  try {
    await api('PATCH', `/api/admin/orders/${id}`, { status });
    toast(`Order #${id} → ${status}`, 'success');
  } catch (err) { toast(err.message, 'error'); }
};

// ─── 404 ──────────────────────────────────────────────────────────────────────
function render404() {
  setHTML(`
    <div class="empty-state" style="min-height:60vh;justify-content:center;display:flex;flex-direction:column;align-items:center">
      <i class="fa fa-map-signs"></i>
      <h2>404 – Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <button class="btn btn-primary" onclick="navigate('/')">Go Home</button>
    </div>`);
}

// ─── Kick-off ─────────────────────────────────────────────────────────────────
init();
