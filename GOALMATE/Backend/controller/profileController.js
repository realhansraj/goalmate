// profileController.js
import bcrypt from 'bcryptjs';
import Profile from '../models/profileModel.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Goal from '../models/goalModel.js';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get user profile
export const getProfile = async (req, res) => {
  try {
    // First check if profile exists
    let profile = await Profile.findOne({ userId: req.userId }).populate('userId', 'name email gender age profilePicture');
    
    // If no profile exists, create one
    if (!profile) {
      profile = new Profile({ userId: req.userId });
      await profile.save();
      // Re-fetch with populated user data
      profile = await Profile.findOne({ userId: req.userId }).populate('userId', 'name email gender age profilePicture');
    }
    
    res.status(200).json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// Update profile information
export const updateProfile = async (req, res) => {
  try {
    console.log("Updating profile...");
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    
    const { bio, location, interests, socialLinks, privacySettings, theme, notificationSettings } = req.body;
    
    // Find profile or create if doesn't exist
    let profile = await Profile.findOne({ userId: req.userId });
    if (!profile) {
      profile = new Profile({ userId: req.userId });
    }
    
    // Update fields if provided
    if (bio !== undefined) profile.bio = bio;
    if (location !== undefined) profile.location = location;
    
    // Handle JSON fields
    try {
      if (interests !== undefined) {
        if (typeof interests === 'string') {
          profile.interests = JSON.parse(interests);
        } else {
          profile.interests = interests;
        }
      }
      
      if (socialLinks !== undefined) {
        if (typeof socialLinks === 'string') {
          profile.socialLinks = JSON.parse(socialLinks);
        } else {
          profile.socialLinks = socialLinks;
        }
      }
      
      if (privacySettings !== undefined) {
        if (typeof privacySettings === 'string') {
          profile.privacySettings = JSON.parse(privacySettings);
        } else {
          profile.privacySettings = privacySettings;
        }
      }
      
      if (theme !== undefined) {
        if (typeof theme === 'string') {
          profile.theme = JSON.parse(theme);
        } else {
          profile.theme = theme;
        }
      }
      
      if (notificationSettings !== undefined) {
        if (typeof notificationSettings === 'string') {
          profile.notificationSettings = JSON.parse(notificationSettings);
        } else {
          profile.notificationSettings = notificationSettings;
        }
      }
    } catch (parseError) {
      console.error('Error parsing JSON fields:', parseError);
      // Continue with update even if JSON parsing fails
    }
    
    // Handle cover photo upload
    if (req.files && req.files.coverPhoto) {
      // Remove old cover photo if it exists
      if (profile.coverPhoto) {
        const oldPhotoPath = path.join(__dirname, '..', 'uploads', path.basename(profile.coverPhoto));
        if (fs.existsSync(oldPhotoPath)) {
          try {
            fs.unlinkSync(oldPhotoPath);
          } catch (unlinkError) {
            console.error('Error deleting old cover photo:', unlinkError);
          }
        }
      }
      profile.coverPhoto = req.files.coverPhoto[0].filename;
    }
    
    await profile.save();
    res.status(200).json({ message: 'Profile updated successfully', profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// Update user information (name, email, etc.)
export const updateUserInfo = async (req, res) => {
  try {
    console.log("Updating user info...");
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    
    const { name, email, age, gender } = req.body;
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user fields if provided
    if (name !== undefined) user.name = name;
    if (email !== undefined) {
      // Check if email is already in use by another user
      const emailExists = await User.findOne({ email, _id: { $ne: req.userId } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    if (age !== undefined) user.age = age;
    if (gender !== undefined) user.gender = gender;
    
    // Handle profile picture upload
    if (req.files && req.files.file) {
      // Remove old profile picture if it exists
      if (user.profilePicture) {
        const oldPhotoPath = path.join(__dirname, '..', 'uploads', path.basename(user.profilePicture));
        if (fs.existsSync(oldPhotoPath)) {
          try {
            fs.unlinkSync(oldPhotoPath);
          } catch (unlinkError) {
            console.error('Error deleting old profile picture:', unlinkError);
          }
        }
      }
      user.profilePicture = req.files.file[0].filename;
    }
    
    await user.save();
    res.status(200).json({ message: 'User information updated successfully', user: {
      id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      gender: user.gender,
      profilePicture: user.profilePicture
    }});
  } catch (error) {
    console.error('Error updating user information:', error);
    res.status(500).json({ message: 'Error updating user information', error: error.message });
  }
};

// Get profile statistics
export const getProfileStats = async (req, res) => {
  try {
    // Get user's profile
    const profile = await Profile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    
    // Get user's goals to calculate real statistics
    const goals = await Goal.find({ createdBy: req.userId });
    
    // Calculate goal stats
    const completedGoals = goals.filter(goal => goal.status === 'Completed').length;
    const totalGoals = goals.length;
    
    // Calculate achievement points - different goals give different points
    let achievementPoints = 0;
    goals.forEach(goal => {
      if (goal.status === 'Completed') {
        // Base points for completion
        achievementPoints += 10;
        
        // Priority-based bonus
        if (goal.priority === 'High') achievementPoints += 5;
        else if (goal.priority === 'Medium') achievementPoints += 3;
        
        // Collaborative goals bonus
        if (goal.goalType === 'Group' || goal.goalType === 'Collaborative') 
          achievementPoints += 5;
      }
    });
    
    // Calculate streak - find consecutive days with progress updates
    let streakDays = 0;
    let currentStreak = 0;
    
    // Extract unique dates from all goal progress histories
    const progressDates = new Set();
    goals.forEach(goal => {
      if (goal.progressHistory && goal.progressHistory.length > 0) {
        goal.progressHistory.forEach(entry => {
          // Format the date to ignore time
          const dateStr = new Date(entry.date).toISOString().split('T')[0];
          progressDates.add(dateStr);
        });
      }
    });
    
    // Convert to array and sort
    const sortedDates = Array.from(progressDates).sort();
    
    // Calculate streak based on consecutive dates
    if (sortedDates.length > 0) {
      currentStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i-1]);
        const currDate = new Date(sortedDates[i]);
        
        // Check if dates are consecutive
        const diffTime = Math.abs(currDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak++;
        } else {
          // Reset streak if days are not consecutive
          currentStreak = 1;
        }
        
        // Update max streak
        streakDays = Math.max(streakDays, currentStreak);
      }
    }
    
    // Update profile with calculated statistics
    profile.completedGoals = completedGoals;
    profile.achievementPoints = achievementPoints;
    profile.streakDays = streakDays;
    await profile.save();
    
    // Return statistics
    res.status(200).json({
      completedGoals,
      totalGoals,
      inProgressGoals: goals.filter(goal => goal.status === 'In Progress').length,
      achievementPoints,
      streakDays,
      categoryBreakdown: getCategoryBreakdown(goals)
    });
    
  } catch (error) {
    console.error('Error fetching profile statistics:', error);
    res.status(500).json({ message: 'Error fetching profile statistics', error: error.message });
  }
};

// Helper function to get category breakdown
const getCategoryBreakdown = (goals) => {
  const categories = {};
  
  goals.forEach(goal => {
    const category = goal.goalCategory || 'Other';
    
    if (!categories[category]) {
      categories[category] = {
        total: 0,
        completed: 0
      };
    }
    
    categories[category].total += 1;
    
    if (goal.status === 'Completed') {
      categories[category].completed += 1;
    }
  });
  
  return categories;
};

// Update user password
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate request
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    await user.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Error updating password', error: error.message });
  }
};

// Delete user account
export const deleteAccount = async (req, res) => {
  try {
    console.log("Deleting account for user:", req.userId);
    
    // Delete profile
    const profileResult = await Profile.findOneAndDelete({ userId: req.userId });
    console.log("Profile deletion result:", profileResult ? "Success" : "Not found");
    
    // Delete user
    const user = await User.findByIdAndDelete(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log("User successfully deleted");
    
    // Delete any files associated with the user
    if (user.profilePicture) {
      const photoPath = path.join(__dirname, '..', 'uploads', path.basename(user.profilePicture));
      if (fs.existsSync(photoPath)) {
        try {
          fs.unlinkSync(photoPath);
          console.log("Profile picture deleted:", photoPath);
        } catch (unlinkError) {
          console.error("Error deleting profile picture:", unlinkError);
          // Continue with account deletion even if file deletion fails
        }
      }
    }
    
    // Note: In a complete implementation, you would also delete all associated data
    // like goals, friendships, chat messages, etc.
    // Here we could add code to delete goals, chats, etc., associated with this user
    
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Error deleting account', error: error.message });
  }
};

export const updateNotificationSettings = async (req, res) => {
  try {
    const { remindersEnabled } = req.body;
    const profile = await Profile.findOne({ userId: req.userId });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    if (typeof remindersEnabled === 'boolean') {
      profile.notificationSettings.remindersEnabled = remindersEnabled;
    }
    await profile.save();
    res.status(200).json({ message: 'Notification settings updated', notificationSettings: profile.notificationSettings });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification settings', error: error.message });
  }
};