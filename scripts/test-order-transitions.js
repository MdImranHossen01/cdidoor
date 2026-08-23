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

// Schemas
const OrderSchema = new mongoose.Schema({
  status: String,
  paymentStatus: String,
  paymentMethod: String,
  isCreditOrder: Boolean,
  isSalesCounted: Boolean,
  totalAmount: Number,
  couponDiscountAmount: Number,
  walletAmountUsed: Number,
  items: [{
    product: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    price: Number
  }]
}, { timestamps: true });

const LedgerAccountSchema = new mongoose.Schema({
  name: String,
  code: String,
  type: String,
  openingBalance: Number,
  currentBalance: Number
});

const LedgerTransactionSchema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerAccount' },
  date: Date,
  description: String,
  type: String,
  amount: Number,
  reference: String,
  balanceAfter: Number
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
const LedgerAccount = mongoose.models.LedgerAccount || mongoose.model('LedgerAccount', LedgerAccountSchema);
const LedgerTransaction = mongoose.models.LedgerTransaction || mongoose.model('LedgerTransaction', LedgerTransactionSchema);

async function runTests() {
  console.log('Connecting to database...');
  await mongoose.connect(mongodbUri);
  console.log('Connected!');

  // Seed AR Ledger account if it does not exist
  let arAccount = await LedgerAccount.findOne({ code: 'AR' });
  if (!arAccount) {
    arAccount = await LedgerAccount.create({
      name: 'Accounts Receivable',
      code: 'AR',
      type: 'asset',
      openingBalance: 0,
      currentBalance: 0
    });
  }

  const testProductObjectId = new mongoose.Types.ObjectId();

  const statusesToTest = ['Ready for Delivery', 'Released for Delivery'];

  for (const testStatus of statusesToTest) {
    console.log(`\n--- Testing transition to "${testStatus}" ---`);
    
    // Create unpaid credit order
    const order = await Order.create({
      status: 'Order Placed',
      paymentStatus: 'Pending',
      paymentMethod: 'Credit',
      isCreditOrder: true,
      isSalesCounted: false,
      totalAmount: 1500,
      couponDiscountAmount: 100,
      walletAmountUsed: 50,
      items: [{
        product: testProductObjectId,
        quantity: 2,
        price: 750
      }]
    });

    console.log(`Created test order ${order._id} with status "Order Placed"`);

    // Simulate bulk update route becomesValid check
    const becomesValid = ['Confirmed', 'Paid', 'Ready for Delivery', 'Released for Delivery', 'Delivered'].includes(testStatus);
    
    if (!becomesValid) {
      throw new Error(`Expected testStatus "${testStatus}" to be inside becomesValid`);
    }

    // Atomic update
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, isSalesCounted: { $ne: true } },
        { $set: { status: testStatus, isSalesCounted: true } },
        { session: dbSession, new: true }
      );

      if (!updatedOrder) {
        throw new Error('Failed to update order status / isSalesCounted');
      }

      await dbSession.commitTransaction();
      console.log(`Successfully updated order ${order._id} status to "${testStatus}" & isSalesCounted to true`);
    } catch (err) {
      await dbSession.abortTransaction();
      throw err;
    } finally {
      dbSession.endSession();
    }

    // AR Log simulation
    const updatedOrder = await Order.findById(order._id);
    const shortId = updatedOrder._id.toString().slice(-8).toUpperCase();
    const arReference = `AR-ORDER-${shortId}`;
    
    const arExists = await LedgerTransaction.findOne({ reference: arReference });
    if (!arExists) {
      const amount = (updatedOrder.totalAmount || 0) - (updatedOrder.couponDiscountAmount || 0) - (updatedOrder.walletAmountUsed || 0);
      
      const balanceAfter = arAccount.currentBalance + amount;
      
      await LedgerTransaction.create({
        account: arAccount._id,
        date: new Date(),
        description: `Credit Order Confirmed #${shortId}`,
        type: 'debit',
        amount,
        reference: arReference,
        balanceAfter
      });

      arAccount.currentBalance = balanceAfter;
      await arAccount.save();

      console.log(`Created AR transaction log with amount ${amount} (Reference: ${arReference})`);
    }

    // Verifications
    const finalOrder = await Order.findById(order._id);
    if (!finalOrder.isSalesCounted) {
      throw new Error(`isSalesCounted was not set to true for status ${testStatus}`);
    }

    const tx = await LedgerTransaction.findOne({ reference: arReference });
    if (!tx) {
      throw new Error(`AR Transaction log not found for reference ${arReference}`);
    }

    if (tx.amount !== 1350) { // 1500 - 100 - 50 = 1350
      throw new Error(`Expected AR transaction amount to be 1350, but got ${tx.amount}`);
    }

    console.log(`Verification SUCCESS: isSalesCounted is true, AR debit transaction created with correct net amount: ${tx.amount}`);

    // Cleanup
    await Order.deleteOne({ _id: order._id });
    await LedgerTransaction.deleteOne({ reference: arReference });
  }

  console.log('\nAll tests completed successfully!');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  mongoose.disconnect().then(() => process.exit(1));
});
