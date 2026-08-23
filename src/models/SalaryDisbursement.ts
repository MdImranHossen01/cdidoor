import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISalaryDisbursement extends Document {
  employee: mongoose.Types.ObjectId;
  amount: number;
  type: 'monthly_salary' | 'task_payment' | 'bonus';
  period?: string;
  date: Date;
  remarks?: string;
  breakdown?: {
    baseSalary?: number;
    proratedSalary?: number;
    workingDays?: number;
    presentDays?: number;
    leaveDays?: number;
    absentDays?: number;
    deduction?: number;
    bonus?: number;
    netPayable?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SalaryDisbursementSchema: Schema<ISalaryDisbursement> = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['monthly_salary', 'task_payment', 'bonus'], required: true },
    period: { type: String },
    date: { type: Date, default: Date.now },
    remarks: { type: String },
    breakdown: {
      baseSalary: { type: Number },
      proratedSalary: { type: Number },
      workingDays: { type: Number },
      presentDays: { type: Number },
      leaveDays: { type: Number },
      absentDays: { type: Number },
      deduction: { type: Number },
      bonus: { type: Number },
      netPayable: { type: Number }
    }
  },
  { timestamps: true }
);

const SalaryDisbursement: Model<ISalaryDisbursement> = mongoose.models.SalaryDisbursement || mongoose.model<ISalaryDisbursement>('SalaryDisbursement', SalaryDisbursementSchema);

export default SalaryDisbursement;
