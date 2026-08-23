const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ── ENV PARSING (BOM + CRLF safe) ────────────────────────────────────────────
const envPath = path.join(__dirname, '../.env.local');
let mongodbUri = '';

if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.charCodeAt(0) === 0xFEFF) envContent = envContent.slice(1);
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('MONGODB_URI=')) {
      mongodbUri = line.substring('MONGODB_URI='.length).trim().replace(/['"\r]/g, '');
      break;
    }
  }
}

if (!mongodbUri) {
  console.error('Could not read MONGODB_URI from .env.local');
  process.exit(1);
}
console.log('Using URI:', mongodbUri.substring(0, 50) + '...');

// ── SCHEMAS ───────────────────────────────────────────────────────────────────
const CategorySchema = new mongoose.Schema({ name: String, slug: String });
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

const ProductSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  slug:          { type: String, required: true, unique: true },
  description:   { type: String, required: true },
  price:         { type: Number, required: true },
  salePrice:     { type: Number },
  wholesalePrice:{ type: Number },
  wholesaleSalePrice: { type: Number },
  purchasePrice: { type: Number },
  discountRate:  { type: Number },
  sku:           { type: String, required: true, unique: true },
  stock:         { type: Number, required: true, default: 0 },
  categories:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  tags:          [String],
  images:        [String],
  attributes:    [{ key: String, value: String }],
  isFeatured:    { type: Boolean, default: false },
  isNewArrival:  { type: Boolean, default: false },
  isFlashSale:   { type: Boolean, default: false },
  isPublished:   { type: Boolean, default: true },
  ratings:       { type: Number, default: 0 },
  numReviews:    { type: Number, default: 0 },
  views:         { type: Number, default: 0 },
  totalSales:    { type: Number, default: 0 },
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// ── SEED ──────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB successfully.\n');

    // Load categories
    const allCats = await Category.find({});
    if (allCats.length === 0) {
      console.error('No categories found! Run seed-categories.js first.');
      process.exit(1);
    }
    const catMap = {};
    allCats.forEach(c => { catMap[c.slug] = c._id; });
    console.log('Categories loaded:', Object.keys(catMap).join(', '), '\n');

    // Clear existing products
    const del = await Product.deleteMany({});
    console.log(`Cleared ${del.deletedCount} existing products.\n`);

    // Load product data
    const dataPath = path.join(__dirname, 'products-data.json');
    const rawProducts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Build docs
    const docs = rawProducts.map(p => {
      const catId = catMap[p.catSlug];
      if (!catId) throw new Error('Category slug not found in DB: ' + p.catSlug);
      const { catSlug, ...rest } = p;
      if (rest.salePrice === null) delete rest.salePrice;
      if (rest.wholesalePrice === null) delete rest.wholesalePrice;
      if (rest.wholesaleSalePrice === null) delete rest.wholesaleSalePrice;
      if (rest.purchasePrice === null) delete rest.purchasePrice;
      if (rest.discountRate === null) delete rest.discountRate;
      return {
        ...rest,
        categories: [catId],
        isPublished: true,
        views: Math.floor(Math.random() * 300) + 50,
        totalSales: Math.floor(Math.random() * 40),
      };
    });

    const result = await Product.insertMany(docs);

    // Summary
    let flash = 0, featured = 0, newArr = 0;
    console.log('Seeded products:\n');
    result.forEach((p, i) => {
      const labels = [];
      if (p.isFlashSale)  { labels.push('FLASH');    flash++;   }
      if (p.isFeatured)   { labels.push('FEATURED'); featured++; }
      if (p.isNewArrival) { labels.push('NEW');       newArr++;  }
      const priceStr = p.salePrice ? `৳${p.price} → ৳${p.salePrice}` : `৳${p.price}`;
      console.log(`  [${String(i+1).padStart(2,'0')}] ${p.name}`);
      console.log(`       Price: ${priceStr} | SKU: ${p.sku} | Stock: ${p.stock}`);
      console.log(`       Tags : ${labels.join(', ') || '—'}\n`);
    });

    console.log('══════════════════════════════════════════');
    console.log(`  Total Products Seeded : ${result.length}`);
    console.log(`  Flash Sale            : ${flash}`);
    console.log(`  Featured              : ${featured}`);
    console.log(`  New Arrivals          : ${newArr}`);
    console.log('══════════════════════════════════════════\n');

  } catch (err) {
    console.error('Seeding error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
