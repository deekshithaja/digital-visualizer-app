import mongoose, { Schema } from 'mongoose';
import { CollectionAdapter } from '../config/db';

export interface CategoryScores {
  accountSecurity: number;
  brokerExposure: number;
  publicMetadata: number;
  domainHygiene: number;
}

export interface ScanReportDoc {
  _id: string;
  userId: string;
  targetId: string | null;
  scope: 'single' | 'full';
  targetLabel: string;
  overallScore: number;
  categoryScores: CategoryScores;
  summary: string;
  findingsFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  durationMs: number;
  createdAt: string;
  updatedAt: string;
}

const scanReportSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    targetId: { type: String, default: null },
    scope: { type: String, enum: ['single', 'full'], default: 'single' },
    targetLabel: { type: String, required: true },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    categoryScores: {
      accountSecurity: { type: Number, default: 100 },
      brokerExposure: { type: Number, default: 100 },
      publicMetadata: { type: Number, default: 100 },
      domainHygiene: { type: Number, default: 100 },
    },
    summary: { type: String, required: true },
    findingsFound: { type: Number, default: 0 },
    criticalCount: { type: Number, default: 0 },
    highCount: { type: Number, default: 0 },
    mediumCount: { type: Number, default: 0 },
    lowCount: { type: Number, default: 0 },
    durationMs: { type: Number, default: 320 },
  },
  { timestamps: true, collection: 'scanreports' }
);

const MongooseScanReport = mongoose.models.ScanReport || mongoose.model('ScanReport', scanReportSchema);
export const ScanReportModel = new CollectionAdapter<ScanReportDoc>('scanreports', MongooseScanReport);
