import mongoose, { Schema, Document } from 'mongoose';

export type SettingCategory =
  | 'application'
  | 'request_handling'
  | 'telegram'
  | 'transfers'
  | 'gateway'
  | 'cache'
  | 'database'
  | 'security';

export interface ISystemSetting extends Document {
  key: string;
  category: SettingCategory;
  label: string;
  description: string;
  value: any;
  defaultValue: any;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  allowedValues?: any[];
  min?: number;
  max?: number;
  requiresRestart: boolean;
  version: number; // Optimistic concurrency control
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    category: {
      type: String,
      required: true,
      enum: [
        'application',
        'request_handling',
        'telegram',
        'transfers',
        'gateway',
        'cache',
        'database',
        'security',
      ],
      index: true,
    },
    label: { type: String, required: true },
    description: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    defaultValue: { type: Schema.Types.Mixed, required: true },
    valueType: {
      type: String,
      enum: ['string', 'number', 'boolean', 'json'],
      required: true,
    },
    allowedValues: [{ type: Schema.Types.Mixed }],
    min: { type: Number },
    max: { type: Number },
    requiresRestart: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    updatedBy: { type: String, default: 'system' },
  },
  {
    timestamps: true,
  }
);

export const SystemSetting = mongoose.model<ISystemSetting>('SystemSetting', systemSettingSchema);
