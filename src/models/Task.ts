import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITask extends Document {
  employee: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'Pending' | 'Completed' | 'Paid';
  payout: number;
  assignedDate: Date;
  completedDate?: Date;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema<ITask> = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['Pending', 'Completed', 'Paid'], default: 'Pending' },
    payout: { type: Number, required: true, default: 0 },
    assignedDate: { type: Date, default: Date.now },
    completedDate: { type: Date },
    dueDate: { type: Date }
  },
  { timestamps: true }
);

const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
