const bcrypt = require('bcryptjs');
const { Users, Categories, Products } = require('./db');

// ─── Categories ───────────────────────────────────────────────────────────────
const categoryNames = ['Electronics', 'Clothing', 'Books', 'Home & Kitchen', 'Sports'];
const catMap = {};

categoryNames.forEach(name => {
  let cat = Categories.findByName(name);
  if (!cat) cat = Categories.create(name);
  catMap[name] = cat.id;
});

// ─── Admin user ───────────────────────────────────────────────────────────────
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

if (!Users.findByEmail(adminEmail)) {
  Users.create({ name: 'Admin', email: adminEmail, password: bcrypt.hashSync(adminPassword, 10), is_admin: true });
}

// ─── Products ─────────────────────────────────────────────────────────────────
const products = [
  {
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Premium over-ear headphones with 30-hour battery life, active noise cancellation, and deep bass. Perfect for music lovers and remote workers.',
    price: 2499, stock: 50,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
    category: 'Electronics', rating: 4.5, reviews_count: 128,
  },
  {
    name: 'Smart 4K LED TV – 55"',
    description: 'Ultra HD 4K display with Dolby Vision, built-in streaming apps, and voice assistant support. Transform your living room.',
    price: 34999, stock: 20,
    image_url: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&q=80',
    category: 'Electronics', rating: 4.3, reviews_count: 76,
  },
  {
    name: 'Mechanical Gaming Keyboard',
    description: 'RGB backlit mechanical keyboard with tactile blue switches, N-key rollover, and durable aluminum frame.',
    price: 3999, stock: 35,
    image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80',
    category: 'Electronics', rating: 4.7, reviews_count: 215,
  },
  {
    name: "Men's Classic Slim-Fit Chinos",
    description: 'Versatile stretch chinos for everyday comfort. Available in multiple colors. Machine washable.',
    price: 1299, stock: 100,
    image_url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80',
    category: 'Clothing', rating: 4.2, reviews_count: 342,
  },
  {
    name: "Women's Running Jacket",
    description: 'Lightweight, water-resistant windbreaker jacket with reflective strips and multiple pockets. Ideal for outdoor runs.',
    price: 2199, stock: 60,
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
    category: 'Clothing', rating: 4.6, reviews_count: 89,
  },
  {
    name: 'Atomic Habits',
    description: "James Clear's bestselling guide on building good habits and breaking bad ones. Over 15 million copies sold worldwide.",
    price: 499, stock: 200,
    image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80',
    category: 'Books', rating: 4.9, reviews_count: 5620,
  },
  {
    name: 'The Psychology of Money',
    description: "Morgan Housel's timeless lessons on wealth, greed, and happiness. A must-read for anyone interested in personal finance.",
    price: 399, stock: 150,
    image_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&q=80',
    category: 'Books', rating: 4.8, reviews_count: 3210,
  },
  {
    name: 'Stainless Steel Cookware Set (5-piece)',
    description: 'Professional-grade tri-ply stainless steel pots and pans. Oven-safe up to 500°F, dishwasher-safe, and induction compatible.',
    price: 4799, stock: 25,
    image_url: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80',
    category: 'Home & Kitchen', rating: 4.4, reviews_count: 194,
  },
  {
    name: 'Ergonomic Office Chair',
    description: 'Lumbar-support mesh chair with adjustable armrests, seat depth, and tilt lock. Designed for 8+ hours of comfort.',
    price: 12999, stock: 15,
    image_url: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&q=80',
    category: 'Home & Kitchen', rating: 4.5, reviews_count: 437,
  },
  {
    name: 'Yoga Mat – Non-Slip 6mm',
    description: 'Eco-friendly TPE yoga mat with alignment lines, carrying strap, and sweat-resistant surface. 183 × 61 cm.',
    price: 899, stock: 80,
    image_url: 'https://images.unsplash.com/photo-1601925228557-b1a68e6b7ec2?w=600&q=80',
    category: 'Sports', rating: 4.6, reviews_count: 762,
  },
  {
    name: 'Adjustable Dumbbell Set (2–24 kg)',
    description: 'Space-saving adjustable dumbbells with quick-select dial. Replaces 15 sets of weights. Ideal for home gyms.',
    price: 8999, stock: 30,
    image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
    category: 'Sports', rating: 4.7, reviews_count: 523,
  },
  {
    name: 'Wireless Charging Pad',
    description: '15W fast wireless charger compatible with iPhone, Samsung, and all Qi-enabled devices. Slim, non-slip design.',
    price: 1199, stock: 70,
    image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
    category: 'Electronics', rating: 4.3, reviews_count: 311,
  },
];

// Only seed if no products exist
if (Products.all().length === 0) {
  products.forEach(p => {
    Products.create({ ...p, category_id: catMap[p.category] });
  });
  console.log(`✅  Seeded ${products.length} products.`);
} else {
  console.log('ℹ️   Products already seeded, skipping.');
}

console.log('\n🌱  Seed complete!');
console.log('   Admin user created.\n');
