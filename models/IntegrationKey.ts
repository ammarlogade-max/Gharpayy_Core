import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIntegrationKey extends Document {
  orgId: mongoose.Types.ObjectId;
  key: string;
  updatedAt?: Date;
  createdAt?: Date;
}

const IntegrationKeySchema = new Schema<IIntegrationKey>({
  orgId: { type: Schema.Types.ObjectId, ref: 'GpAttUser', required: true, unique: true },
  key: { type: String, required: true },
}, { timestamps: true });

const IntegrationKey: Model<IIntegrationKey> =
  mongoose.models.GpIntegrationKey ||
  mongoose.model<IIntegrationKey>('GpIntegrationKey', IntegrationKeySchema);

export default IntegrationKey;
