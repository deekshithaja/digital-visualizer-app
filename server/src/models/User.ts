import mongoose, { Schema } from 'mongoose';
import { CollectionAdapter } from '../config/db';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  briefingTone: 'calm' | 'concise';
  scanFrequency: 'weekly' | 'monthly' | 'manual';
  emailAlerts: boolean;
}

export interface UserDoc {
  _id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  avatarUrl: string;
  role: 'member';
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: '/src/assets/images/avatar_officer_profile_1795078539079.jpg' },
    role: { type: String, enum: ['member'], default: 'member' },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
      briefingTone: { type: String, enum: ['calm', 'concise'], default: 'calm' },
      scanFrequency: { type: String, enum: ['weekly', 'monthly', 'manual'], default: 'weekly' },
      emailAlerts: { type: Boolean, default: true },
    },
  },
  { timestamps: true, collection: 'users' }
);

const MongooseUser = mongoose.models.User || mongoose.model('User', userSchema);
export const UserModel = new CollectionAdapter<UserDoc>('users', MongooseUser);
