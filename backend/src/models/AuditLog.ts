import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: string;
  actorEmail: string;
  action: string;
  category: string;
  resourceId?: string;
  details?: Record<string, any>;
  changes?: {
    before?: any;
    after?: any;
  };
  status: 'success' | 'failure';
  errorMessage?: string;
  requestId?: string;
  clientIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true, index: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    resourceId: { type: String },
    details: { type: Schema.Types.Mixed },
    changes: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
    status: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
    errorMessage: { type: String },
    requestId: { type: String },
    clientIp: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast administrative querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
