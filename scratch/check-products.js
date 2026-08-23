const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

const CategorySchema = new mongoose.Schema({ name: String, slug: String });
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

const ProductSchema = new mongoose.Schema({
  name: String,
  slug: String,
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
});
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function check() {
  let exitCode = 0;
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB.');
    const products = await Product.find({}).populate('categories');
    console.log(`Found ${products.length} products total.`);
    products.forEach((p, idx) => {
      console.log(`[Product ${idx + 1}] Name: ${p.name}`);
      const catList = (p.categories || [])
        .map(c => (c ? `${c.name} (${c.slug})` : '[Dangling Reference]'))
        .join(', ');
      console.log(`   Categories: ${catList || 'NONE'}`);
    });
  } catch (err) {
    console.error('Error:', err);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(exitCode);
  }
}

check();
