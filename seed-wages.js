import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://cdidoorind:QqHXg2clOeGzdQP7@ac-jrowhop-shard-00-00.e5n1hnl.mongodb.net:27017,ac-jrowhop-shard-00-01.e5n1hnl.mongodb.net:27017,ac-jrowhop-shard-00-02.e5n1hnl.mongodb.net:27017/cdidoorind?ssl=true&replicaSet=atlas-qnqnrr-shard-0&authSource=admin&retryWrites=true&w=majority';

const TransactionCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
  },
  { timestamps: true }
);

const TransactionCategory = mongoose.models.TransactionCategory || mongoose.model('TransactionCategory', TransactionCategorySchema);

async function seedWages() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const existing = await TransactionCategory.findOne({ name: 'Wages', type: 'expense' });
    if (!existing) {
      await TransactionCategory.create({ name: 'Wages', type: 'expense' });
      console.log('Successfully seeded Wages category!');
    } else {
      console.log('Wages category already exists.');
    }
  } catch (err) {
    console.error('Error seeding wages:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

seedWages();
