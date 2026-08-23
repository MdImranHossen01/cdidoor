import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  user?: mongoose.Types.ObjectId;
  clientName?: string;
  clientMobile?: string;
  clientEmail?: string;
  amount: number;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Scan QR' | 'Bank Transfer';
  transactionId?: string;
  senderNumber?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  notes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema<IPayment> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    clientName: {
      type: String,
      required: false,
      trim: true,
    },
    clientMobile: {
      type: String,
      required: false,
      trim: true,
    },
    clientEmail: {
      type: String,
      required: false,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      enum: ['bKash', 'Nagad', 'Rocket', 'Scan QR', 'Bank Transfer'],
      required: [true, 'Payment method is required'],
    },
    transactionId: {
      type: String,
      trim: true,
    },
    senderNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    reviewedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Validation helper
const validateMobileDetails = (paymentMethod: string, transactionId?: string, senderNumber?: string) => {
  if (paymentMethod !== 'Scan QR' && !transactionId && !senderNumber) {
    throw new Error('Either Transaction ID or Sender Mobile Number must be provided for mobile banking.');
  }
};

// Pre-save validation hook
PaymentSchema.pre('save', function (next: any) {
  try {
    validateMobileDetails(this.paymentMethod, this.transactionId, this.senderNumber);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Pre-update validation hook
PaymentSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next: any) {
  const update = this.getUpdate() as any;
  const paymentMethod = update.paymentMethod || (update.$set && update.$set.paymentMethod);
  if (paymentMethod && paymentMethod !== 'Scan QR') {
    const transactionId = update.transactionId || (update.$set && update.$set.transactionId);
    const senderNumber = update.senderNumber || (update.$set && update.$set.senderNumber);
    try {
      validateMobileDetails(paymentMethod, transactionId, senderNumber);
    } catch (error: any) {
      return next(error);
    }
  }
  next();
});

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
