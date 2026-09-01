import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IBillItem {
  productId?: mongoose.Types.ObjectId;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
  batchesUsed?: { batchNumber: string; quantity: number }[];
}

export interface IBill extends Document {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientEmail?: string;
  clientDivision?: string;
  clientDistrict?: string;
  clientThana?: string;
  clientArea?: string;
  clientImage?: string;
  invoiceNo: string;
  date: Date;
  items: IBillItem[];
  subtotal: number;
  deliveryCharge: number;
  serviceFee: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discount: number;
  couponCode?: string;
  couponDiscount?: number;
  walletAmountUsed?: number;
  total: number;
  prevDue: number;
  gTotal: number;
  cashIn: number;
  changeReturn?: number;
  currentBillDue: number;
  status: 'Paid' | 'Due';
  expectedReceivableDate?: Date;
  documentType?: 'offer' | 'chalan' | 'bill';
  convertedFrom?: mongoose.Types.ObjectId | string;
  showroom?: mongoose.Types.ObjectId;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillSchema: Schema<IBill> = new Schema(
  {
    clientName: { type: String, required: true },
    clientPhone: { type: String, required: true },
    clientAddress: { type: String },
    clientEmail: { type: String },
    clientDivision: { type: String },
    clientDistrict: { type: String },
    clientThana: { type: String },
    clientArea: { type: String },
    clientImage: { type: String },
    invoiceNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    transactionId: { type: String },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        variantId: { type: String },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
        batchesUsed: [
          {
            batchNumber: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 }
          }
        ]
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    discountValue: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String },
    couponDiscount: { type: Number, default: 0, min: 0 },
    walletAmountUsed: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    prevDue: { type: Number, default: 0, min: 0 },
    gTotal: { type: Number, required: true, min: 0 },
    cashIn: { type: Number, default: 0, min: 0 },
    changeReturn: { type: Number, default: 0, min: 0 },
    currentBillDue: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Paid', 'Due'], default: 'Due' },
    expectedReceivableDate: { type: Date },
    documentType: { type: String, enum: ['offer', 'chalan', 'bill'], default: 'bill' },
    convertedFrom: { type: Schema.Types.ObjectId, ref: 'Bill' },
    showroom: { type: Schema.Types.ObjectId, ref: 'Showroom' },
  },
  { timestamps: true }
);

const Bill: Model<IBill> = mongoose.models.Bill || mongoose.model<IBill>('Bill', BillSchema);

export default Bill;
