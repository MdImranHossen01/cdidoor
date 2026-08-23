import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD format for easy daily queries
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  checkIn?: Date;
  checkOut?: Date;
  autoFilled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema<IAttendance> = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    status: { type: String, enum: ['Present', 'Absent', 'Late', 'Leave'], required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    autoFilled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Create compound index so an employee can only have one attendance log per calendar date
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
