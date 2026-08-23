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

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function check() {
  let exitCode = 0;
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB.');
    const users = await User.find({ role: 'manager' }, 'name email role _id');
    console.log(`Found ${users.length} managers total.`);
    users.forEach(u => {
      console.log(`User: ${u.name} (${u.email}) - Role: ${u.role} - ID: ${u._id}`);
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
