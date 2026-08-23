import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISupplierPayment extends Document {
  supplier: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: 'Cash' | 'Bank';
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierPaymentSchema: Schema<ISupplierPayment> = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Bank'], default: 'Cash' },
    description: { type: String },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const SupplierPayment: Model<ISupplierPayment> = mongoose.models.SupplierPayment || mongoose.model<ISupplierPayment>('SupplierPayment', SupplierPaymentSchema);

export default SupplierPayment;
