import mongoose, { Schema, Document } from 'mongoose';

export interface ISession {
  checkIn: Date;
  checkOut: Date | null;
  workMinutes: number;
  lat: number | null;
  lng: number | null;
}

export interface IAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD IST
  dayStatus: 'Early' | 'On Time' | 'Late' | 'Absent';
  sessions: ISession[];
  totalWorkMins: number;
  isCheckedIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>({
  checkIn:     { type: Date, required: true },
  checkOut:    { type: Date, default: null },
  workMinutes: { type: Number, default: 0 },
  lat:         { type: Number, default: null },
  lng:         { type: Number, default: null },
}, { _id: false });

const AttendanceSchema = new Schema<IAttendance>({
  employeeId:    { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true },
  date:          { type: String, required: true },
  dayStatus:     { type: String, enum: ['Early', 'On Time', 'Late', 'Absent'], default: 'Absent' },
  sessions:      { type: [SessionSchema], default: [] },
  totalWorkMins: { type: Number, default: 0 },
  isCheckedIn:   { type: Boolean, default: false },
}, { timestamps: true });

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.models.GpAttendance || mongoose.model<IAttendance>('GpAttendance', AttendanceSchema);
