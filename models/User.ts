import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'employee';
  dateOfBirth?: string;
  jobRole?: 'full-time' | 'intern';
  profilePhoto?: string;
  officeZoneId?: mongoose.Types.ObjectId;
  isApproved?: boolean;
  managerId?: mongoose.Types.ObjectId;
  teamName?: string;
  department?: string;
  workSchedule?: {
    startTime: string;
    endTime: string;
    breakDuration: number;
    isLocked: boolean;
    setBy: 'employee' | 'admin';
  };
  leaves?: {
    date: string;
    type: 'day_off';
    status: 'approved';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkScheduleSchema = new Schema({
  startTime:     { type: String, default: '' },
  endTime:       { type: String, default: '' },
  breakDuration: { type: Number, default: 0 },
  isLocked:      { type: Boolean, default: false },
  setBy:         { type: String, enum: ['employee', 'admin'], default: 'employee' },
}, { _id: false });

const LeaveSchema = new Schema({
  date:   { type: String, required: true },
  type:   { type: String, enum: ['day_off'], default: 'day_off' },
  status: { type: String, enum: ['approved'], default: 'approved' },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  fullName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  role:         { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
  dateOfBirth:  { type: String },
  jobRole:      { type: String, enum: ['full-time', 'intern'] },
  profilePhoto: { type: String },
  officeZoneId: { type: Schema.Types.ObjectId, ref: 'GpOfficeZone' },
  isApproved:   { type: Boolean, default: false },
  managerId:    { type: Schema.Types.ObjectId, ref: 'GpAttUser', default: null },
  teamName:     { type: String, default: '' },
  department:   { type: String, default: '' },
  workSchedule: { type: WorkScheduleSchema, default: () => ({}) },
  leaves:       { type: [LeaveSchema], default: [] },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

export default mongoose.models.GpAttUser || mongoose.model<IUser>('GpAttUser', UserSchema);
