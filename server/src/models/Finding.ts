import mongoose, { Schema } from 'mongoose';
import { CollectionAdapter } from '../config/db';

export type FindingCategory = 'accountSecurity' | 'brokerExposure' | 'publicMetadata' | 'domainHygiene';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type FindingStatus = 'open' | 'acknowledged' | 'resolved' | 'false_positive';

export interface FindingDoc {
  _id: string;
  userId: string;
  targetId: string;
  scanReportId: string;
  category: FindingCategory;
  severity: SeverityLevel;
  status: FindingStatus;
  title: string;
  plainSummary: string;
  whyItMatters: string;
  evidence: string;
  sourceName: string;
  impactPoints: number;
  recommendedSteps: string[];
  detectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const findingSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    targetId: { type: String, required: true, index: true },
    scanReportId: { type: String, required: true },
    category: {
      type: String,
      enum: ['accountSecurity', 'brokerExposure', 'publicMetadata', 'domainHygiene'],
      required: true,
    },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved', 'false_positive'],
      default: 'open',
    },
    title: { type: String, required: true },
    plainSummary: { type: String, required: true },
    whyItMatters: { type: String, required: true },
    evidence: { type: String, required: true },
    sourceName: { type: String, required: true },
    impactPoints: { type: Number, default: 5 },
    recommendedSteps: [{ type: String }],
    detectedAt: { type: String, required: true },
    resolvedAt: { type: String, default: null },
  },
  { timestamps: true, collection: 'findings' }
);

const MongooseFinding = mongoose.models.Finding || mongoose.model('Finding', findingSchema);
export const FindingModel = new CollectionAdapter<FindingDoc>('findings', MongooseFinding);
