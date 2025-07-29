// /Users/admin/Documents/GOALMATE/Backend/models/goalModel.js

import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  // Basic goal info
  title: { type: String, required: true },
  description: { type: String, required: true },
  goalType: { type: String, enum: ['Individual', 'Group', 'Collaborative'], default: 'Individual' },
  
  // New field for collaborative sub-types
  collaborativeType: { 
    type: String, 
    enum: ['compete', 'achieve-together'], 
    default: null 
  },
  
  goalCategory: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  
  // Dates
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  
  // Tracking preferences
  frequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], default: 'Daily' },
  progressFrequency: { type: String, enum: ['Daily', 'Weekly'], default: 'Daily' },
  
  // Status tracking
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed', 'Archived'], default: 'Not Started' },
  
  // Fitness specific fields
  fitnessType: { type: String, enum: ['Running', 'Cycling', 'Swimming', 'Weight Training', 'Tennis', 'Yoga', 'Squash', 'Basketball'] },
  duration: { type: Number },
  distance: { type: Number },
  sets: { type: Number },
  reps: { type: Number },
  weight: { type: Number },
  
  // Education specific fields
  educationType: { type: String, enum: ['Course Completion', 'Book Reading', 'Skill Development', 'Certification', 'Language Learning'] },
  studyHours: { type: Number },
  pages: { type: Number },
  modules: { type: Number },
  testScore: { type: String },
  
  // User reference
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // For group/collaborative goals
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Updated schema with startValue and endValue:
subTasks: [{
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  status: { 
    type: String, 
    enum: ['Not Started', 'In Progress', 'Completed'], 
    default: 'Not Started' 
  },
  // New fields to track range values
  startValue: { type: Number, default: 0 },
  endValue: { type: Number, default: 0 },
  completionPercentage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}],
  
  // Progress tracking - updated to support individual progress for "compete" type
  progressHistory: [{
    date: { type: Date, default: Date.now },
    value: { type: Number, default: 0 },
    notes: { type: String },
    updatedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    // For achieve-together type, track which sub-task this progress is for
    subTaskId: { 
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  }],
  
  // Individual progress tracking for "compete" type goals
  individualProgress: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    completionPercentage: { type: Number, default: 0 },
    totalProgress: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Overall completion percentage
  completionPercentage: { type: Number, default: 0 },
  
  // Custom category if user creates one
  isCustomCategory: { type: Boolean, default: false }
},
{
  timestamps: true
});

// Add indexes for efficient querying
goalSchema.index({ createdBy: 1 });
goalSchema.index({ goalCategory: 1 });
goalSchema.index({ status: 1 });
goalSchema.index({ participants: 1 });
goalSchema.index({ collaborativeType: 1 });

// Virtual for checking if goal is overdue
goalSchema.virtual('isOverdue').get(function() {
  return new Date() > this.endDate && this.status !== 'Completed';
});

// Method to update goal progress with support for different collaborative types
goalSchema.methods.updateProgress = function(progressValue, notes, userId, subTaskId = null) {
  if (this.collaborativeType === 'compete') {
    // For compete type, update individual progress
    const userProgressIndex = this.individualProgress.findIndex(
      p => p.userId.toString() === userId
    );
    
    if (userProgressIndex === -1) {
      // Initialize individual progress if not exists
      this.individualProgress.push({
        userId: userId,
        completionPercentage: 0,
        totalProgress: progressValue,
        lastUpdated: new Date()
      });
    } else {
      // Update existing individual progress
      this.individualProgress[userProgressIndex].totalProgress += progressValue;
      this.individualProgress[userProgressIndex].lastUpdated = new Date();
      
      // Calculate individual completion percentage based on goal metrics
      const totalProgress = this.individualProgress[userProgressIndex].totalProgress;
      let targetValue = 0;
      
      if (this.goalCategory === 'Fitness') {
        if (this.fitnessType === 'Running' && this.distance) {
          targetValue = this.distance;
        } else if (this.duration) {
          targetValue = this.duration;
        } else if (this.sets) {
          targetValue = this.sets;
        }
      } else if (this.goalCategory === 'Education') {
        if (this.educationType === 'Book Reading' && this.pages) {
          targetValue = this.pages;
        } else if (this.modules) {
          targetValue = this.modules;
        } else if (this.studyHours) {
          targetValue = this.studyHours;
        }
      }
      
      if (targetValue > 0) {
        this.individualProgress[userProgressIndex].completionPercentage = 
          Math.min(100, (totalProgress / targetValue) * 100);
      }
    }
    
    // Update overall completion as average of all participants
    if (this.individualProgress.length > 0) {
      const totalCompletion = this.individualProgress.reduce(
        (sum, p) => sum + p.completionPercentage, 0
      );
      this.completionPercentage = totalCompletion / this.individualProgress.length;
    }
  } else if (this.collaborativeType === 'achieve-together' && subTaskId) {
    // For achieve-together type, update sub-task progress
    const subTaskIndex = this.subTasks.findIndex(
      st => st._id.toString() === subTaskId
    );
    
    if (subTaskIndex !== -1) {
      // Update sub-task status and completion
      const subTask = this.subTasks[subTaskIndex];
      subTask.completionPercentage = Math.min(100, progressValue);
      
      if (subTask.completionPercentage === 100) {
        subTask.status = 'Completed';
      } else if (subTask.completionPercentage > 0) {
        subTask.status = 'In Progress';
      }
      
      // Calculate overall completion as average of all sub-tasks
      const totalSubTaskCompletion = this.subTasks.reduce(
        (sum, st) => sum + st.completionPercentage, 0
      );
      this.completionPercentage = totalSubTaskCompletion / this.subTasks.length;
    }
  } else {
    // Default behavior for regular goals and legacy achieve-together without sub-tasks
    const totalProgress = this.progressHistory.reduce((sum, entry) => sum + entry.value, 0) + progressValue;
    
    // Calculate completion percentage based on specific metrics
    if (this.goalCategory === 'Fitness') {
      if (this.fitnessType === 'Running' && this.distance) {
        this.completionPercentage = Math.min(100, (totalProgress / this.distance) * 100);
      } else if (this.duration) {
        this.completionPercentage = Math.min(100, (totalProgress / this.duration) * 100);
      } else if (this.sets) {
        this.completionPercentage = Math.min(100, (totalProgress / this.sets) * 100);
      } else {
        this.completionPercentage = Math.min(100, totalProgress);
      }
    } else if (this.goalCategory === 'Education') {
      if (this.educationType === 'Book Reading' && this.pages) {
        this.completionPercentage = Math.min(100, (totalProgress / this.pages) * 100);
      } else if (this.modules) {
        this.completionPercentage = Math.min(100, (totalProgress / this.modules) * 100);
      } else if (this.studyHours) {
        this.completionPercentage = Math.min(100, (totalProgress / this.studyHours) * 100);
      } else {
        this.completionPercentage = Math.min(100, totalProgress);
      }
    } else {
      this.completionPercentage = Math.min(100, totalProgress);
    }
  }
  
  // Add to progress history
  this.progressHistory.push({
    date: new Date(),
    value: progressValue,
    notes: notes || '',
    updatedBy: userId,
    subTaskId: subTaskId
  });
  
  // Update goal status based on completion
  if (this.completionPercentage >= 100) {
    this.status = 'Completed';
  } else if (this.completionPercentage > 0) {
    this.status = 'In Progress';
  }
  
  return this.save();
};

// Middleware to set default status when creating a new goal
goalSchema.pre('save', function(next) {
  if (this.isNew) {
    this.status = 'Not Started';
    
    // Set isCustomCategory flag
    if (this.goalCategory !== 'Fitness' && this.goalCategory !== 'Education') {
      this.isCustomCategory = true;
    }
    
    // Initialize individual progress for compete type collaborative goals
    if (this.collaborativeType === 'compete' && this.participants.length > 0) {
      // Initialize progress for all participants
      this.individualProgress = this.participants.map(participantId => ({
        userId: participantId,
        completionPercentage: 0,
        totalProgress: 0,
        lastUpdated: new Date()
      }));
      
      // Also include the creator
      if (!this.participants.includes(this.createdBy)) {
        this.individualProgress.push({
          userId: this.createdBy,
          completionPercentage: 0,
          totalProgress: 0,
          lastUpdated: new Date()
        });
      }
    }
  }
  next();
});

const Goal = mongoose.model('Goal', goalSchema);
export default Goal;