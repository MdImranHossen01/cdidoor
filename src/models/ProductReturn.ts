import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IReturnItem {
  product: mongoose.Types.ObjectId;
  variantId?: string;
  batchNumber?: string;
  quantity: number;
  price: number; // The price at which it was originally sold
}

export interface IProductReturn extends Document {
  returnId: string;
  bill?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  customerName?: string;
  phone?: string;
  showroom?: mongoose.Types.ObjectId;
  items: IReturnItem[];
  reason: string;
  refundAmount: number;
  returnedAt: Date;
  processedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema: Schema<IReturnItem> = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: String },
  batchNumber: { type: String }, // The batch it was returned to
  quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
  price: { type: Number, required: true },
});

const ProductReturnSchema: Schema<IProductReturn> = new Schema(
  {
    returnId: { type: String, required: true, unique: true },
    bill: { type: Schema.Types.ObjectId, ref: 'Bill', required: false },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: false },
    customerName: { type: String },
    phone: { type: String },
    showroom: { type: Schema.Types.ObjectId, ref: 'Showroom' },
    items: { type: [ReturnItemSchema], required: true },
    reason: { type: String, required: true },
    refundAmount: { type: Number, required: true, default: 0 },
    returnedAt: { type: Date, default: Date.now },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

if (mongoose.models.ProductReturn) {
  delete mongoose.models.ProductReturn;
}
const ProductReturn: Model<IProductReturn> = mongoose.model<IProductReturn>('ProductReturn', ProductReturnSchema);

export default ProductReturn;
