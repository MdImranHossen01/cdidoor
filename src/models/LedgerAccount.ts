import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILedgerAccount extends Document {
  name: string;
  code: string;
  accountCategory?: 'MFS' | 'Bank' | 'Cash';
  mfsProvider?: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'mCash';
  mfsType?: 'Merchant' | 'Agent' | 'Personal';
  branchName?: string;
  bankAccountType?: 'Savings' | 'Current';
  accountNo?: string;
  note?: string;
  openingBalance: number;
  currentBalance: number;
  type: 'asset' | 'liability' | 'expense' | 'revenue' | 'equity';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerAccountSchema: Schema<ILedgerAccount> = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    accountCategory: { type: String, enum: ['MFS', 'Bank', 'Cash'] },
    mfsProvider: { type: String, enum: ['bKash', 'Nagad', 'Rocket', 'Upay', 'mCash'] },
    mfsType: { type: String, enum: ['Merchant', 'Agent', 'Personal'] },
    branchName: { type: String },
    bankAccountType: { type: String, enum: ['Savings', 'Current'] },
    accountNo: { type: String },
    note: { type: String },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    type: { type: String, enum: ['asset', 'liability', 'expense', 'revenue', 'equity'], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const LedgerAccount: Model<ILedgerAccount> =
  mongoose.models.LedgerAccount || mongoose.model<ILedgerAccount>('LedgerAccount', LedgerAccountSchema);

export default LedgerAccount;
