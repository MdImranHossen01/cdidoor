const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local file to get MONGODB_URI
const envPath = path.join(__dirname, '../.env.local');
let mongodbUri = '';

if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
  const uriLine = envLines.find(line => line.trim().startsWith('MONGODB_URI='));
  if (uriLine) {
    mongodbUri = uriLine.split('MONGODB_URI=')[1].trim().replace(/['"]/g, '');
  }
}

if (!mongodbUri) {
  mongodbUri = 'mongodb+srv://CDI Door Ind:xI2QuBaFZsYQ5vRD@cluster0.e5n1hnl.mongodb.net/CDI Door Ind';
}

if (mongodbUri) {
  mongodbUri = mongodbUri.replace(/\r/g, '').trim();
}
console.log('Connecting to MongoDB URL:', mongodbUri.replace(/:([^:@]+)@/, ':****@'));

const FAQSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const FAQ = mongoose.models.FAQ || mongoose.model('FAQ', FAQSchema);

const faqs = [
  {
    question: 'চিটাগাং ডোর ইন্ডাস্ট্রি (CDI Door Ind) কী ধরনের দরজা অফার করে?',
    answer: 'আমরা সব ধরনের প্রিমিয়াম মানের দরজা তৈরি ও সরবরাহ করি। এর মধ্যে রয়েছে সলিড কাঠের দরজা (বার্মিজ সেগুন, গামারি, মেহগনি ইত্যাদি), হাই গ্লস লেমিনেটেড দরজা, ভিনিয়ার্ড ফ্ল্যাশ ডোর এবং আধুনিক ডিজাইনার খোদাই করা কাঠের দরজা।',
    order: 1,
    isActive: true,
  },
  {
    question: 'দরজা তৈরিতে আপনারা কী ধরনের কাঠ এবং ট্রিটমেন্ট ব্যবহার করেন?',
    answer: 'আমরা অত্যন্ত যত্নসহকারে বাছাই করা সেরা বার্মিজ সেগুন (Burmese Teak), চিটাগাং গামারি (Gamari) এবং মেহগনি (Mahogany) কাঠ ব্যবহার করি। আমাদের প্রতিটি কাঠ কেমিক্যাল ট্রিটমেন্ট এবং কিলন সিজনিং (seasoning) প্রক্রিয়ার মধ্য দিয়ে যায়, যা দরজা বাঁকা হওয়া, ফাঁক হওয়া বা উইপোকা লাগা থেকে দীর্ঘমেয়াদী সুরক্ষা দেয়।',
    order: 2,
    isActive: true,
  },
  {
    question: 'দরজার সাইজ কি আমাদের ফ্রেমের মাপ অনুযায়ী কাস্টমাইজ করা সম্ভব?',
    answer: 'হ্যাঁ! আমাদের প্রতিটি দরজা আপনার নির্দিষ্ট দরজার ফ্রেম বা চৌকাঠের নিখুঁত পরিমাপ অনুযায়ী কাস্টমাইজ করে তৈরি করা সম্ভব। অর্ডার করার সময় আপনি আপনার কাঙ্ক্ষিত উচ্চতা, প্রস্থ এবং পুরুত্ব (thickness) উল্লেখ করে দিতে পারেন।',
    order: 3,
    isActive: true,
  },
  {
    question: 'কাঠের দরজার উজ্জ্বলতা ও স্থায়িত্ব ধরে রাখতে কীভাবে যত্ন নেওয়া উচিত?',
    answer: 'দরজায় সরাসরি অতিরিক্ত পানি বা স্যাঁতসেঁতে পরিবেশ এড়ানো ভালো। পরিষ্কার করার জন্য শুকনো বা সামান্য ভেজা নরম সুতি কাপড় ব্যবহার করুন। দরজার নতুনের মতো উজ্জ্বলতা ধরে রাখতে প্রতি ২-৩ বছর পর পর উড পলিশ (wood polish) করার পরামর্শ দেওয়া হচ্ছে।',
    order: 4,
    isActive: true,
  },
  {
    question: 'ডেলিভারি সময়সীমা এবং ডেলিভারি চার্জ কেমন?',
    answer: 'আমরা সারা বাংলাদেশে ডেলিভারি সেবা দিয়ে থাকি। দরজার কাঠ ও নকশার ওপর ভিত্তি করে সাধারণত ৭ থেকে ১৫ কার্যদিবসের মধ্যে ডেলিভারি করা হয়। ডেলিভারি চার্জ আপনার লোকেশন এবং অর্ডারের পরিমাণের ওপর ভিত্তি করে নির্ধারিত হয়।',
    order: 5,
    isActive: true,
  }
];

async function seed() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB successfully.');

    // Clear existing FAQs
    const deleteResult = await FAQ.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing FAQs.`);

    // Insert new FAQs
    const insertResult = await FAQ.insertMany(faqs);
    console.log(`Seeded ${insertResult.length} FAQs successfully:`);
    insertResult.forEach((f, i) => {
      console.log(`[FAQ ${i + 1}] Question: "${f.question}"`);
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
