import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IExpense extends Document {
  title: string;
  amount: number;
  category: string;
  type: 'expense' | 'income';
  date: Date;
  description?: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  showroom?: mongoose.Types.ObjectId;
  employee?: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  customerPhone?: string;
  accountCode: string;
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
    employee: { type: Schema.Types.ObjectId, ref: 'User' },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    customerPhone: { type: String },
    accountCode: {
      type: String,
      default: 'CASH',
      required: true,
    },
  },
  { timestamps: true }
);

if (mongoose.models.Expense) {
  delete mongoose.models.Expense;
}
const Expense: Model<IExpense> = mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;

