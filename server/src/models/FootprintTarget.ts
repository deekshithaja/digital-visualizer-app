import mongoose, { Schema } from 'mongoose';
import { CollectionAdapter } from '../config/db';

export type TargetType = 'email' | 'domain' | 'social' | 'phone' | 'alias';

export interface FootprintTargetDoc {
  _id: string;
  userId: string;
  type: TargetType;
  value: string;
  label: string;
  status: 'active' | 'paused';
  healthScore: number;
  exposureLevel: 'low' | 'moderate' | 'elevated' | 'critical';
  lastScannedAt: string | null;
  findingCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

const footprintTargetSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['email', 'domain', 'social', 'phone', 'alias'], required: true },
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
    healthScore: { type: Number, default: 100, min: 0, max: 100 },
    exposureLevel: { type: String, enum: ['low', 'moderate', 'elevated', 'critical'], default: 'low' },
    lastScannedAt: { type: String, default: null },
    findingCounts: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
  },
  { timestamps: true, collection: 'footprinttargets' }
);

const MongooseFootprintTarget =
  mongoose.models.FootprintTarget || mongoose.model('FootprintTarget', footprintTargetSchema);
export const FootprintTargetModel = new CollectionAdapter<FootprintTargetDoc>(
  'footprinttargets',
  MongooseFootprintTarget
);
