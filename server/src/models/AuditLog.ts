import mongoose, { Schema } from 'mongoose';
import { CollectionAdapter } from '../config/db';

export interface AuditLogDoc {
  _id: string;
  userId: string;
  action: string;
  actorLabel: string;
  summary: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const auditLogSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    actorLabel: { type: String, required: true },
    summary: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'auditlogs' }
);

const MongooseAuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export const AuditLogModel = new CollectionAdapter<AuditLogDoc>('auditlogs', MongooseAuditLog);
