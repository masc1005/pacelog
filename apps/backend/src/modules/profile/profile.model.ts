import { Schema, model, Document } from 'mongoose';
import { SPORT_KEYS, type SportKey } from '@pacelog/shared';

export interface IProfile extends Document {
  userId: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  unitSystem: 'metric' | 'imperial';
  timezone: string;
  firstDayOfWeek: 0 | 1; // 0 = Domingo, 1 = Segunda
  theme: 'dark' | 'light' | 'system';
  weeklySessionGoal: number;
  streakEnabled: boolean;
  aiInsightsEnabled: boolean;
  activeSports: SportKey[];
  primarySportKey?: SportKey;
  onboardingCompletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    unitSystem: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
    },
    timezone: {
      type: String,
      default: 'America/Bahia',
    },
    firstDayOfWeek: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    theme: {
      type: String,
      enum: ['dark', 'light', 'system'],
      default: 'dark',
    },
    weeklySessionGoal: {
      type: Number,
      min: 0,
      max: 50,
      default: 4,
    },
    streakEnabled: {
      type: Boolean,
      default: true,
    },
    aiInsightsEnabled: {
      type: Boolean,
      default: true,
    },
    activeSports: {
      type: [String],
      enum: SPORT_KEYS,
      default: ['running'],
    },
    primarySportKey: {
      type: String,
      enum: SPORT_KEYS,
      default: 'running',
    },
    onboardingCompletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ProfileModel = model<IProfile>('Profile', profileSchema);
