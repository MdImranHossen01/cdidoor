const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local file to get MONGODB_URI
const envPath = path.join(__dirname, '../.env.local');
let mongodbUri = '';

if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  // Strip UTF-8 BOM if present
  if (envContent.charCodeAt(0) === 0xFEFF) envContent = envContent.slice(1);
  // Handle both LF and CRLF line endings
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('MONGODB_URI=')) {
      mongodbUri = line.substring('MONGODB_URI='.length).trim().replace(/['"]|\r/g, '');
      break;
    }
  }
}

if (!mongodbUri) {
  console.error('Could not read MONGODB_URI from .env.local');
  process.exit(1);
}

console.log('Using URI starting with:', mongodbUri.substring(0, 50) + '...');

console.log('Connecting to MongoDB...');

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    image: { type: String },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

const categories = [
  {
    name: 'লৌহা কাঠের চৌকাঠ',
    slug: 'flush-doors',
    image: '/assets/images/cagetory/cat-flush-door.webp',
    isActive: true,
  },
  {
    name: 'মেহগনি কাঠের দরজা',
    slug: 'laminated-doors',
    image: '/assets/images/cagetory/cat-laminated-door.webp',
    isActive: true,
  },
  {
    name: 'গামারী কাঠের দরজা',
    slug: 'panelled-doors',
    image: '/assets/images/cagetory/cat-panelled-door.webp',
    isActive: true,
  },
  {
    name: 'সেগুন কাঠের দরজা',
    slug: 'carved-designer-doors',
    image: '/assets/images/cagetory/cat-carved-designer-door.webp',
    isActive: true,
  },
  {
    name: 'চাপালিশ কাঠের দরজা',
    slug: 'solid-wood-doors',
    image: '/assets/images/cagetory/cat-solid-wood-door.webp',
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB successfully.');

    // Clear existing categories
    const deleteResult = await Category.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing categories.`);

    // Insert new categories
    const insertResult = await Category.insertMany(categories);
    console.log(`Seeded ${insertResult.length} categories successfully:`);
    insertResult.forEach((c, i) => {
      console.log(`[Category ${i + 1}] Name: "${c.name}", Slug: "${c.slug}", Image: "${c.image}"`);
    });

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
