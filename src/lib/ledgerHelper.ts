import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';

/**
 * Seed primary ledger accounts if they do not exist
 */
export async function seedLedgerAccounts() {
  await connectToDatabase();

  const accounts: { name: string; code: 'CASH' | 'AR' | 'AP' | 'INTEREST_EXP'; type: 'asset' | 'liability' | 'expense' | 'equity' | 'revenue' }[] = [
    { name: 'Cash', code: 'CASH', type: 'asset' },
    { name: 'Accounts Receivable', code: 'AR', type: 'asset' },
    { name: 'Accounts Payable', code: 'AP', type: 'liability' },
    { name: 'Interest Expense', code: 'INTEREST_EXP', type: 'expense' },
  ];

  for (const acc of accounts) {
    const exists = await LedgerAccount.findOne({ code: acc.code });
    if (!exists) {
      await LedgerAccount.create({
        name: acc.name,
        code: acc.code,
        type: acc.type,
        openingBalance: 0,
        currentBalance: 0,
      });
    }
  }
}

/**
 * Syncs any confirmed/delivered unpaid Credit Orders to Accounts Receivable in the Ledger
 */
export async function syncCreditOrdersToLedgerAR() {
  try {
    const Order = (await import('@/models/Order')).default;
    const creditOrders = await Order.find({
      $or: [{ paymentMethod: 'Credit' }, { isCreditOrder: true }],
      status: { $in: ['Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
      paymentStatus: { $ne: 'Paid' },
      deletedAt: null
    }).lean() as any[];

    for (const order of creditOrders) {
      const amount = (order.totalAmount || 0) - (order.couponDiscountAmount || 0) - (order.walletAmountUsed || 0);
      const shortId = order._id.toString().slice(-8).toUpperCase();
      const arReference = `AR-ORDER-${shortId}`;
      const arExists = await LedgerTransaction.findOne({ reference: arReference });
      if (!arExists && amount > 0) {
        await logLedgerTransaction(
          'AR',
          'debit',
          amount,
          `Credit Order Confirmed #${shortId}`,
          arReference,
          order.createdAt ? new Date(order.createdAt) : new Date(),
          undefined,
          order.showroom ? order.showroom.toString() : undefined
        );
      }
    }
  } catch (err) {
    console.error('[Ledger] Error syncing credit orders to AR:', err);
  }
}

export async function logLedgerTransaction(
  accountCode: string,
  type: 'debit' | 'credit',
  amount: number,
  description: string,
  reference?: string,
  date: Date = new Date(),
  transferId?: string,
  showroomId?: string,
  session?: any
) {
  await connectToDatabase();
  await seedLedgerAccounts();

  // Find account
  const account = await LedgerAccount.findOne({ code: accountCode }).session(session);
  if (!account) {
    throw new Error(`Ledger account not found with code: ${accountCode}`);
  }

  // Calculate balanceAfter
  // For assets: debit increases, credit decreases
  // For liabilities: credit increases, debit decreases
  const change = account.type === 'liability'
    ? (type === 'credit' ? amount : -amount)
    : (type === 'debit' ? amount : -amount);
  const balanceAfter = account.currentBalance + change;

  // Create transaction
  const transaction = new LedgerTransaction({
    account: account._id,
    date,
    description,
    type,
    amount,
    reference,
    transferId,
    balanceAfter,
    showroom: showroomId || undefined,
  });

  const latestTx = await LedgerTransaction.findOne({ account: account._id })
    .sort({ date: -1, createdAt: -1 })
    .session(session);
  const needsRecalc = latestTx && new Date(date) < new Date(latestTx.date);

  await transaction.save({ session });

  // Update current account balance
  account.currentBalance = balanceAfter;
  await account.save({ session });

  // Recalculate to keep chronological order correct in the DB running balances only if inserted in the past
  if (needsRecalc) {
    await recalculateLedgerBalance(accountCode as any, session);
  }

  return transaction;
}

/**
 * Recalculate ledger balance for an account
 */
export async function recalculateLedgerBalance(accountCode: string, session?: any) {
  await connectToDatabase();
  const account = await LedgerAccount.findOne({ code: accountCode }).session(session);
  if (!account) return;

  const transactions = await LedgerTransaction.find({ account: account._id }).sort({ date: 1, createdAt: 1 }).session(session);

  let runningBalance = account.openingBalance || 0;

  for (const tx of transactions) {
    const change = account.type === 'liability'
      ? (tx.type === 'credit' ? tx.amount : -tx.amount)
      : (tx.type === 'debit' ? tx.amount : -tx.amount);
    runningBalance += change;
    tx.balanceAfter = runningBalance;
    await tx.save({ session });
  }

  account.currentBalance = runningBalance;
  await account.save({ session });
}

/**
 * Log order payment to the ledger
 */
export async function logOrderPaymentToLedger(order: any) {
  try {
    await connectToDatabase();
    
    // All order payments go to CASH regardless of payment method
    const accountCode = 'CASH';
    
    const amount = order.totalAmount || 0;
    const orderIdStr = order._id.toString();
    const shortId = orderIdStr.slice(-8).toUpperCase();
    
    const description = `Customer payment received for Order #${shortId}`;
    const reference = `ORDER-${shortId}`;
    
    // Ensure idempotency: check if transaction with this reference already exists
    const exists = await LedgerTransaction.findOne({ reference });
    if (exists) {
      console.log(`[Ledger] Entry already exists for order reference: ${reference}`);
      return;
    }
    
    await logLedgerTransaction(
      accountCode,
      'debit', // Debit increases Cash or Bank
      amount,
      description,
      reference,
      order.createdAt ? new Date(order.createdAt) : new Date(),
      undefined,
      order.showroom ? order.showroom.toString() : undefined
    );

    // If it is a credit order payment, we also need to decrease AR
    if (order.isCreditOrder || order.paymentMethod === 'Credit') {
      const arReference = `AR-CREDIT-${shortId}`;
      const arExists = await LedgerTransaction.findOne({ reference: arReference });
      if (!arExists) {
        const netAmount = (order.totalAmount || 0) - (order.couponDiscountAmount || 0) - (order.walletAmountUsed || 0);
        await logLedgerTransaction(
          'AR',
          'credit', // Credit decreases Accounts Receivable
          netAmount,
          `Payment received for Credit Order #${shortId}`,
          arReference,
          new Date(), // Use current date for payment reception
          undefined,
          order.showroom ? order.showroom.toString() : undefined
        );
        console.log(`[Ledger] Logged AR credit for Order #${shortId} successfully.`);
      }
    }

    console.log(`[Ledger] Logged payment for Order #${shortId} to ${accountCode} successfully.`);
  } catch (error) {
    console.error('[Ledger] Error logging order payment to ledger:', error);
  }
}
