import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import LedgerAccount from '@/models/LedgerAccount';
import LedgerTransaction from '@/models/LedgerTransaction';
import { recalculateLedgerBalance } from '@/lib/ledgerHelper';

/**
 * One-time cleanup route: removes the default BANK account from the database.
 * - Finds all LedgerTransactions assigned to the BANK account
 * - Re-assigns them to the CASH account
 * - Deletes the BANK LedgerAccount
 *
 * Call once via: GET /api/admin/ledger/cleanup-bank
 */
export async function GET() {
  try {
    await connectToDatabase();

    const bankAccount = await LedgerAccount.findOne({ code: 'BANK' });
    if (!bankAccount) {
      return NextResponse.json({ message: 'BANK account not found. Nothing to clean up.' });
    }

    const cashAccount = await LedgerAccount.findOne({ code: 'CASH' });
    if (!cashAccount) {
      return NextResponse.json({ error: 'CASH account not found. Cannot migrate transactions.' }, { status: 500 });
    }

    // Reassign all BANK transactions to CASH
    const migrated = await LedgerTransaction.updateMany(
      { account: bankAccount._id },
      { $set: { account: cashAccount._id } }
    );

    // Delete the BANK account
    await LedgerAccount.deleteOne({ _id: bankAccount._id });

    // Recalculate CASH balance
    await recalculateLedgerBalance('CASH');

    return NextResponse.json({
      success: true,
      message: `BANK account removed. ${migrated.modifiedCount} transactions migrated to CASH.`,
      migratedTransactions: migrated.modifiedCount,
    });
  } catch (error) {
    console.error('[cleanup-bank] Error:', error);
    return NextResponse.json({ error: 'Cleanup failed', details: String(error) }, { status: 500 });
  }
}
