import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IEmployeeProfile extends Document {
  user: mongoose.Types.ObjectId;
  employeeType: 'monthly' | 'task-based';
  baseSalary?: number;
  weekendDays?: string[];
  allowedAbsents?: number;
  absentDeductionRate?: number;
  basicSalary?: number;
  allowance?: number;
  deduction?: number;
  appointmentLetter?: string;
  joinedDate: Date;
  status: 'active' | 'discontinued';
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeProfileSchema: Schema<IEmployeeProfile> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeType: { type: String, enum: ['monthly', 'task-based'], required: true },
    baseSalary: { type: Number, default: 0 },
    weekendDays: { type: [String], default: ['Friday'] },
    allowedAbsents: { type: Number, default: 1 },
    absentDeductionRate: { type: Number, default: 0 },
    basicSalary: { type: Number, default: 0 },
    allowance: { type: Number, default: 0 },
    deduction: { type: Number, default: 0 },
    appointmentLetter: { type: String },
    joinedDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'discontinued'], default: 'active' }
  },
  { timestamps: true }
);

const EmployeeProfile: Model<IEmployeeProfile> = mongoose.models.EmployeeProfile || mongoose.model<IEmployeeProfile>('EmployeeProfile', EmployeeProfileSchema);

export default EmployeeProfile;
