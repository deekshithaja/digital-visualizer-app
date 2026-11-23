import mongoose, { Schema } from 'mongoose';
import { CollectionAdapter } from '../config/db';

export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DemoAccountStatus = string;

export interface DemoBreachRecordDoc {
  _id: string;
  id: string;
  full_name: string;
  email: string;
  username: string;
  password_hash_md5: string;
  password_hash_sha256: string;
  phone: string;
  ip_address_at_breach: string;
  breach_source: string;
  breach_date: string;
  security_question: string;
  account_status: string;
  createdAt: string;
  updatedAt: string;
}

const demoBreachRecordSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    username: { type: String, required: true },
    password_hash_md5: { type: String, required: true },
    password_hash_sha256: { type: String, required: true },
    phone: { type: String, required: true },
    ip_address_at_breach: { type: String, required: true },
    breach_source: { type: String, required: true },
    breach_date: { type: String, required: true },
    security_question: { type: String, required: true },
    account_status: { type: String, required: true },
  },
  { timestamps: true, collection: 'demo_breach_records' }
);

const MongooseDemoBreachRecord =
  mongoose.models.DemoBreachRecord ||
  mongoose.model('DemoBreachRecord', demoBreachRecordSchema);

export const DemoBreachRecordModel = new CollectionAdapter<DemoBreachRecordDoc>(
  'demo_breach_records',
  MongooseDemoBreachRecord
);
