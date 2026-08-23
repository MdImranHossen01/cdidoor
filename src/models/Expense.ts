import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IExpense extends Document {
  title: string;
  amount: number;
  category: 'Ads' | 'Salary' | 'Rent' | 'Utility' | 'Sales' | 'Investment' | 'Service' | 'Others';
  type: 'expense' | 'income';
  date: Date;
  description?: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  showroom?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema<IExpense> = new Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: [0, 'Amount cannot be negative'] },
    category: {
      type: String,
      required: true,
      enum: ['Ads', 'Salary', 'Rent', 'Utility', 'Sales', 'Investment', 'Service', 'Others'],
      default: 'Others',
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      default: 'expense',
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String },
    status: {
      type: String,
      enum: ['Approved', 'Pending', 'Rejected'],
      default: 'Approved',
      required: true,
    },
    showroom: { type: Schema.Types.ObjectId, ref: 'Showroom' },
  },
  { timestamps: true }
);

const Expense: Model<IExpense> = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;

