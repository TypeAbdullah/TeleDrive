import mongoose, { Document, Schema } from 'mongoose';

export interface IAllowedDiscordUser extends Document {
  username: string; // Lowercased Discord username, e.g. "typeabdullah"
  discordId?: string; // Optional numeric snowflake ID
  addedBy: string; // Admin email, "cli", or "system"
  addedAt: Date;
  notes?: string;
}

const AllowedDiscordUserSchema = new Schema<IAllowedDiscordUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    discordId: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    addedBy: {
      type: String,
      default: 'cli',
      trim: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'allowed_discord_users',
  }
);

export const AllowedDiscordUser = mongoose.model<IAllowedDiscordUser>(
  'AllowedDiscordUser',
  AllowedDiscordUserSchema
);
