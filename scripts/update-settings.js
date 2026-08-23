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

const GlobalSettingsSchema = new mongoose.Schema(
  {
    brandName: { type: String },
    metaTitle: { type: String },
    marqueeText: { type: String }
  },
  { timestamps: true, collection: 'globalsettings' }
);
const GlobalSettings = mongoose.models.GlobalSettings || mongoose.model('GlobalSettings', GlobalSettingsSchema);

async function run() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB.');

    let settings = await GlobalSettings.findOne().sort({ updatedAt: -1 });
    if (settings) {
      settings.brandName = 'চিটাগাং ডোর';
      settings.metaTitle = 'চিটাগাং ডোর';
      settings.marqueeText = 'চিটাগাং ডোর-এ আপনাকে স্বাগতম!';
      await settings.save();
      console.log('Updated existing settings successfully.');
    } else {
      settings = await GlobalSettings.create({
        brandName: 'চিটাগাং ডোর',
        metaTitle: 'চিটাগাং ডোর',
        marqueeText: 'চিটাগাং ডোর-এ আপনাকে স্বাগতম!'
      });
      console.log('Created new settings successfully.');
    }
    console.log('Settings in DB:', settings);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
