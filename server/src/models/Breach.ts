import mongoose, { Schema } from 'mongoose';
import { CollectionAdapter } from '../config/db';

export interface BreachDoc {
  _id: string;
  userId: string;
  email: string;
  breach_source: string;
  breach_date: string;
  account_status: string;
  exposed_data_classes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  provenance: 'simulated';
  dataset: string;
  disclaimer: string;
  createdAt: string;
  updatedAt: string;
}

const breachSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    breach_source: { type: String, required: true },
    breach_date: { type: String, required: true },
    account_status: { type: String, required: true },
    exposed_data_classes: [{ type: String }],
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    provenance: { type: String, default: 'simulated' },
    dataset: { type: String, required: true },
    disclaimer: { type: String, required: true },
  },
  { timestamps: true, collection: 'breaches' }
);

const MongooseBreach = mongoose.models.Breach || mongoose.model('Breach', breachSchema);

export const BreachModel = new CollectionAdapter<BreachDoc>('breaches', MongooseBreach);
