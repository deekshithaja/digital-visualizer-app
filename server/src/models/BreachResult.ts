import mongoose, { Schema } from 'mongoose';
import { CollectionAdapter } from '../config/db';
import { BreachSeverity, DemoAccountStatus } from './DemoBreachRecord';

export interface BreachMaskedFields {
  email: string;
  username?: string;
  phone?: string;
  ip_address?: string;
}

export interface BreachResultDoc {
  _id: string;
  userId: string;
  emailHash: string;
  found: boolean;
  recordId: string | null;
  breach_source: string | null;
  breach_date: string | null;
  account_status: DemoAccountStatus | null;
  exposed_data_classes: string[];
  severity: BreachSeverity | 'none';
  masked_fields: BreachMaskedFields;
  message: string;
  provenance: 'simulated';
  badge: 'SIMULATED DEMO DATA';
  dataset: string;
  disclaimer: string;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
}

const breachResultSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    emailHash: { type: String, required: true, index: true },
    found: { type: Boolean, required: true },
    recordId: { type: String, default: null },
    breach_source: { type: String, default: null },
    breach_date: { type: String, default: null },
    account_status: {
      type: String,
      enum: ['active', 'deactivated', 'password_reset_required', null],
      default: null,
    },
    exposed_data_classes: [{ type: String }],
    severity: {
      type: String,
      enum: ['high', 'medium', 'low', 'none'],
      required: true,
    },
    masked_fields: {
      email: { type: String, required: true },
      username: { type: String },
      phone: { type: String },
      ip_address: { type: String },
    },
    message: { type: String, required: true },
    provenance: { type: String, enum: ['simulated'], default: 'simulated', required: true },
    badge: { type: String, enum: ['SIMULATED DEMO DATA'], default: 'SIMULATED DEMO DATA', required: true },
    dataset: { type: String, required: true },
    disclaimer: { type: String, required: true },
    checkedAt: { type: String, required: true },
  },
  { timestamps: true, collection: 'breaches' }
);

breachResultSchema.index({ userId: 1, emailHash: 1 }, { unique: true });

export const MongooseBreachResult =
  mongoose.models.BreachResult || mongoose.model('BreachResult', breachResultSchema);

export const BreachResultModel = new CollectionAdapter<BreachResultDoc>(
  'breaches',
  MongooseBreachResult
);
