const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Env parsing
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

async function run() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB.');

    // Unset wholesalePrice on root level for all products
    const rootResult = await mongoose.connection.collection('products').updateMany(
      {},
      { $unset: { wholesalePrice: "" } }
    );

    // Unset wholesalePrice within variants array only for products that have variants
    const variantResult = await mongoose.connection.collection('products').updateMany(
      { variants: { $exists: true, $ne: null } },
      { $unset: { "variants.$[].wholesalePrice": "" } }
    );

    console.log(`Successfully completed migration.`);
    console.log(`Root unset - Matched: ${rootResult.matchedCount}, Modified: ${rootResult.modifiedCount}`);
    console.log(`Variants unset - Matched: ${variantResult.matchedCount}, Modified: ${variantResult.modifiedCount}`);
  } catch (err) {
    console.error('Error executing migration:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run();
