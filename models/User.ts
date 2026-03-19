import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'employee';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  fullName: { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
  createdAt:{ type: Date, default: Date.now },
});

export default mongoose.models.GpAttUser || mongoose.model<IUser>('GpAttUser', UserSchema);
