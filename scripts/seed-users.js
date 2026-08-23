const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

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
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    role: { type: String, enum: ['super_admin', 'admin', 'manager', 'showroom_manager', 'wholesaler', 'employee', 'user'], default: 'user' },
    phone: { type: String },
    isSubscriptionActive: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 }
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const EmployeeProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeType: { type: String, enum: ['monthly', 'task-based'], required: true },
    baseSalary: { type: Number, default: 0 },
    taskRate: { type: Number, default: 0 },
    joinedDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);
const EmployeeProfile = mongoose.models.EmployeeProfile || mongoose.model('EmployeeProfile', EmployeeProfileSchema);

const ShowroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
const Showroom = mongoose.models.Showroom || mongoose.model('Showroom', ShowroomSchema);

// ── SEEDING ───────────────────────────────────────────────────────────────────
async function seedUsers() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB successfully.\n');

    const passwordHash = bcrypt.hashSync('password123', 12);
    const seededData = [];

    // Helper function to create/update user
    const upsertUser = async (name, email, role, phone) => {
      let user = await User.findOne({ email });
      if (user) {
        user.name = name;
        user.role = role;
        user.password = passwordHash;
        user.phone = phone;
        await user.save();
        console.log(`Updated user: ${email} (${role})`);
      } else {
        user = await User.create({
          name,
          email,
          password: passwordHash,
          role,
          phone
        });
        console.log(`Created user: ${email} (${role})`);
      }
      return user;
    };

    // 1. Wholesalers
    console.log('--- Seeding Wholesalers ---');
    const ws1 = await upsertUser('Demo Wholesaler 1', 'wholesaler1@example.com', 'wholesaler', '01711111111');
    const ws2 = await upsertUser('Demo Wholesaler 2', 'wholesaler2@example.com', 'wholesaler', '01722222222');
    seededData.push({ type: 'Wholesaler 1', email: 'wholesaler1@example.com', name: ws1.name });
    seededData.push({ type: 'Wholesaler 2', email: 'wholesaler2@example.com', name: ws2.name });

    // 2. Permanent Employees (monthly)
    console.log('--- Seeding Permanent Employees ---');
    const empPerm1 = await upsertUser('Permanent Employee 1', 'empperm1@example.com', 'employee', '01733333333');
    const empPerm2 = await upsertUser('Permanent Employee 2', 'empperm2@example.com', 'employee', '01744444444');
    
    await EmployeeProfile.findOneAndUpdate(
      { user: empPerm1._id },
      { employeeType: 'monthly', baseSalary: 25000 },
      { upsert: true, new: true }
    );
    await EmployeeProfile.findOneAndUpdate(
      { user: empPerm2._id },
      { employeeType: 'monthly', baseSalary: 28000 },
      { upsert: true, new: true }
    );
    seededData.push({ type: 'Permanent Employee 1', email: 'empperm1@example.com', name: empPerm1.name });
    seededData.push({ type: 'Permanent Employee 2', email: 'empperm2@example.com', name: empPerm2.name });

    // 3. Contractual Employees (task-based)
    console.log('--- Seeding Contractual Employees ---');
    const empCont1 = await upsertUser('Contractual Employee 1', 'empcont1@example.com', 'employee', '01755555555');
    const empCont2 = await upsertUser('Contractual Employee 2', 'empcont2@example.com', 'employee', '01766666666');

    await EmployeeProfile.findOneAndUpdate(
      { user: empCont1._id },
      { employeeType: 'task-based', taskRate: 500 },
      { upsert: true, new: true }
    );
    await EmployeeProfile.findOneAndUpdate(
      { user: empCont2._id },
      { employeeType: 'task-based', taskRate: 600 },
      { upsert: true, new: true }
    );
    seededData.push({ type: 'Contractual Employee 1', email: 'empcont1@example.com', name: empCont1.name });
    seededData.push({ type: 'Contractual Employee 2', email: 'empcont2@example.com', name: empCont2.name });

    // 4. Managers
    console.log('--- Seeding Managers ---');
    const mgr1 = await upsertUser('General Manager 1', 'manager1@example.com', 'manager', '01777777777');
    const mgr2 = await upsertUser('General Manager 2', 'manager2@example.com', 'manager', '01788888888');
    seededData.push({ type: 'Manager 1', email: 'manager1@example.com', name: mgr1.name });
    seededData.push({ type: 'Manager 2', email: 'manager2@example.com', name: mgr2.name });

    // 5. Showroom Managers
    console.log('--- Seeding Showroom Managers ---');
    const smgr1 = await upsertUser('Showroom Manager 1', 'showroom_mgr1@example.com', 'showroom_manager', '01799999999');
    const smgr2 = await upsertUser('Showroom Manager 2', 'showroom_mgr2@example.com', 'showroom_manager', '01700000000');

    // Create/update Showrooms
    const showroom1 = await Showroom.findOneAndUpdate(
      { manager: smgr1._id },
      { name: 'Dhaka Main Showroom', address: 'Mirpur, Dhaka', isActive: true },
      { upsert: true, new: true }
    );
    const showroom2 = await Showroom.findOneAndUpdate(
      { manager: smgr2._id },
      { name: 'Chittagong Outlet', address: 'GEC Circle, Chittagong', isActive: true },
      { upsert: true, new: true }
    );
    console.log(`Ensured Showroom: ${showroom1.name} assigned to ${smgr1.email}`);
    console.log(`Ensured Showroom: ${showroom2.name} assigned to ${smgr2.email}`);

    seededData.push({ type: 'Showroom Manager 1', email: 'showroom_mgr1@example.com', name: smgr1.name, showroom: showroom1.name });
    seededData.push({ type: 'Showroom Manager 2', email: 'showroom_mgr2@example.com', name: smgr2.name, showroom: showroom2.name });

    console.log('\n======================================');
    console.log('USERS SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================\n');
    console.log(JSON.stringify(seededData, null, 2));

  } catch (err) {
    console.error('Seeding users error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seedUsers();
