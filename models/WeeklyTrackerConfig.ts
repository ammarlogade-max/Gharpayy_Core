import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWeeklyTrackerConfig extends Document {
  orgId: mongoose.Types.ObjectId;
  g1Label: string;
  g2Label: string;
  g3Label: string;
  g4Label: string;
  glToursLabel: string;
  updatedAt?: Date;
  createdAt?: Date;
}

const WeeklyTrackerConfigSchema = new Schema<IWeeklyTrackerConfig>({
  orgId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true, unique: true },
  g1Label: { type: String, default: 'G1' },
  g2Label: { type: String, default: 'G2' },
  g3Label: { type: String, default: 'G3' },
  g4Label: { type: String, default: 'G4' },
  glToursLabel: { type: String, default: 'GL Tours' },
}, { timestamps: true });

const WeeklyTrackerConfig: Model<IWeeklyTrackerConfig> =
  mongoose.models.GpWeeklyTrackerConfig ||
  mongoose.model<IWeeklyTrackerConfig>('GpWeeklyTrackerConfig', WeeklyTrackerConfigSchema);

export default WeeklyTrackerConfig;

