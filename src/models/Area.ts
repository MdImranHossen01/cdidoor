import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IArea extends Document {
  name: string;
  division: string;
  district?: string;
  thana?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AreaSchema: Schema<IArea> = new Schema(
  {
    name: { type: String, required: true },
    division: { type: String, required: true },
    district: { type: String },
    thana: { type: String },
  },
  { timestamps: true }
);

const Area: Model<IArea> = mongoose.models.Area || mongoose.model<IArea>('Area', AreaSchema);

export default Area;
