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
      mongodbUri = line.substring('MONGODB_URI='.length).trim().replace(/['"]/g, '');
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

const BannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    link: { type: String },
    primaryBtnText: { type: String },
    primaryBtnLink: { type: String },
    secondaryBtnText: { type: String },
    secondaryBtnLink: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Banner = mongoose.models.Banner || mongoose.model('Banner', BannerSchema);

const banners = [
  {
    title: 'Premium Solid Wood Doors',
    image: '/assets/images/Banner/solid-wood-door-banner.webp',
    link: 'https://www.cdidoorind.com/shop',
    primaryBtnText: 'Shop Now',
    primaryBtnLink: 'https://www.cdidoorind.com/shop',
    secondaryBtnText: 'Contact Us',
    secondaryBtnLink: 'https://wa.me/8801711005231',
    order: 1,
    isActive: true,
  },
  {
    title: 'Modern Flush Doors',
    image: '/assets/images/Banner/flush-door-banner.webp',
    link: 'https://www.cdidoorind.com/shop',
    primaryBtnText: 'Shop Now',
    primaryBtnLink: 'https://www.cdidoorind.com/shop',
    secondaryBtnText: 'Contact Us',
    secondaryBtnLink: 'https://wa.me/8801711005231',
    order: 2,
    isActive: true,
  },
  {
    title: 'Classic Panelled Doors',
    image: '/assets/images/Banner/panelled-door-banner.webp',
    link: 'https://www.cdidoorind.com/shop',
    primaryBtnText: 'Shop Now',
    primaryBtnLink: 'https://www.cdidoorind.com/shop',
    secondaryBtnText: 'Contact Us',
    secondaryBtnLink: 'https://wa.me/8801711005231',
    order: 3,
    isActive: true,
  },
  {
    title: 'Luxury Carved & Designer Doors',
    image: '/assets/images/Banner/carved-door-banner.webp',
    link: 'https://www.cdidoorind.com/shop',
    primaryBtnText: 'Shop Now',
    primaryBtnLink: 'https://www.cdidoorind.com/shop',
    secondaryBtnText: 'Contact Us',
    secondaryBtnLink: 'https://wa.me/8801711005231',
    order: 4,
    isActive: true,
  },
  {
    title: 'Contemporary Laminated Doors',
    image: '/assets/images/Banner/laminated-door-banner.webp',
    link: 'https://www.cdidoorind.com/shop',
    primaryBtnText: 'Shop Now',
    primaryBtnLink: 'https://www.cdidoorind.com/shop',
    secondaryBtnText: 'Contact Us',
    secondaryBtnLink: 'https://wa.me/8801711005231',
    order: 5,
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB successfully.');

    // Clear existing banners
    const deleteResult = await Banner.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing banners.`);

    // Insert new banners
    const insertResult = await Banner.insertMany(banners);
    console.log(`Seeded ${insertResult.length} banners successfully:`);
    insertResult.forEach((b, i) => {
      console.log(`[Banner ${i + 1}] Title: "${b.title}", Image: "${b.image}"`);
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
