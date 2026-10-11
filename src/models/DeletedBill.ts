import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDeletedBill extends Document {
  invoiceNo: string;
  date: Date;
  gTotal: number;
  cashIn: number;
  currentBillDue: number;
  deletedAt: Date;
  deletedBy: string;
}

const DeletedBillSchema: Schema<IDeletedBill> = new Schema(
  {
    invoiceNo: { type: String, required: true },
    date: { type: Date, required: true },
    gTotal: { type: Number, required: true },
    cashIn: { type: Number, required: true },
    currentBillDue: { type: Number, required: true },
    deletedAt: { type: Date, default: Date.now },
    deletedBy: { type: String, required: true },
  },
  { timestamps: true }
);

DeletedBillSchema.index({ deletedAt: -1 });

const DeletedBill: Model<IDeletedBill> = mongoose.models.DeletedBill || mongoose.model<IDeletedBill>('DeletedBill', DeletedBillSchema);

export default DeletedBill;
