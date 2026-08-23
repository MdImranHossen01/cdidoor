import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILedgerTransaction extends Document {
  account: mongoose.Types.ObjectId | string;
  date: Date;
  description: string;
  type: 'debit' | 'credit';
  amount: number;
  reference?: string;
  transferId?: string;
  balanceAfter: number;
  showroom?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerTransactionSchema: Schema<ILedgerTransaction> = new Schema(
  {
    account: { type: Schema.Types.ObjectId, ref: 'LedgerAccount', required: true },
    date: { type: Date, default: Date.now, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true, enum: ['debit', 'credit'] },
    amount: { type: Number, required: true, min: [0, 'Amount cannot be negative'] },
    reference: { type: String },
    transferId: { type: String },
    balanceAfter: { type: Number, required: true },
    showroom: { type: Schema.Types.ObjectId, ref: 'Showroom' },
  },
  { timestamps: true }
);

const LedgerTransaction: Model<ILedgerTransaction> =
  mongoose.models.LedgerTransaction || mongoose.model<ILedgerTransaction>('LedgerTransaction', LedgerTransactionSchema);

export default LedgerTransaction;
