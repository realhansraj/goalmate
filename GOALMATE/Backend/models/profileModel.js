// profileModel.js
import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    bio: {
      type: String,
      default: '',
      maxlength: 300
    },
    coverPhoto: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      default: ''
    },
    interests: [{
      type: String,
      trim: true
    }],
    socialLinks: {
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' }
    },
    achievementPoints: {
      type: Number,
      default: 0
    },
    completedGoals: {
      type: Number,
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    privacySettings: {
      showCompletedGoals: { type: Boolean, default: true },
      showAchievements: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: false }
    },
    theme: {
      colorScheme: { type: String, default: 'orange' },
      darkMode: { type: Boolean, default: false }
    },
    notificationSettings: {
      goalReminders: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      goalUpdates: { type: Boolean, default: true },
      remindersEnabled: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

// Virtual field to get user information
profileSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Method to increment completed goals and achievement points
profileSchema.methods.addCompletedGoal = async function() {
  this.completedGoals += 1;
  this.achievementPoints += 10;
  return this.save();
};

// Method to update streak
profileSchema.methods.updateStreak = async function(days) {
  this.streakDays = Math.max(this.streakDays, days);
  return this.save();
};

const Profile = mongoose.model('Profile', profileSchema);
export default Profile;