import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStockTransfer extends Document {
  product: mongoose.Types.ObjectId;
  sourceShowroom?: mongoose.Types.ObjectId; // If null, source is Central
  showroom?: mongoose.Types.ObjectId; // If null, destination is Central
  quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferSchema: Schema<IStockTransfer> = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sourceShowroom: { type: Schema.Types.ObjectId, ref: 'Showroom' },
    showroom: { type: Schema.Types.ObjectId, ref: 'Showroom' },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    },
    notes: { type: String },
  },
  { timestamps: true }
);

const StockTransfer: Model<IStockTransfer> = mongoose.models.StockTransfer || mongoose.model<IStockTransfer>('StockTransfer', StockTransferSchema);

export default StockTransfer;
