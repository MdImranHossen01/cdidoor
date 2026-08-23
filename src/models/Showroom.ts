import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IShowroom extends Document {
  name: string;
  address?: string;
  image?: string;
  manager: mongoose.Types.ObjectId; // ref User
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShowroomSchema: Schema<IShowroom> = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    image: { type: String },
    manager: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Showroom: Model<IShowroom> = mongoose.models.Showroom || mongoose.model<IShowroom>('Showroom', ShowroomSchema);

export default Showroom;
