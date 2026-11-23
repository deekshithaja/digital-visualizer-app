import mongoose, { Schema } from 'mongoose';
import { CollectionAdapter } from '../config/db';
import { FindingCategory, SeverityLevel } from './Finding';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'dismissed';

export interface TaskStep {
  id: string;
  label: string;
  done: boolean;
}

export interface RemediationTaskDoc {
  _id: string;
  userId: string;
  findingId: string | null;
  targetId: string | null;
  title: string;
  description: string;
  category: FindingCategory;
  severity: SeverityLevel;
  status: TaskStatus;
  impactPoints: number;
  estimatedMinutes: number;
  steps: TaskStep[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const remediationTaskSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    findingId: { type: String, default: null },
    targetId: { type: String, default: null },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['accountSecurity', 'brokerExposure', 'publicMetadata', 'domainHygiene'],
      required: true,
    },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed', 'dismissed'],
      default: 'todo',
    },
    impactPoints: { type: Number, default: 5 },
    estimatedMinutes: { type: Number, default: 5 },
    steps: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        done: { type: Boolean, default: false },
      },
    ],
    completedAt: { type: String, default: null },
  },
  { timestamps: true, collection: 'remediationtasks' }
);

const MongooseRemediationTask =
  mongoose.models.RemediationTask || mongoose.model('RemediationTask', remediationTaskSchema);
export const RemediationTaskModel = new CollectionAdapter<RemediationTaskDoc>(
  'remediationtasks',
  MongooseRemediationTask
);
