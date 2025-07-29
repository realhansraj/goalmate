// appSettingsModel.js
import mongoose from 'mongoose';

const appSettingsSchema = new mongoose.Schema({
    // Feature toggles
    features: {
        allowGoalSharing: { type: Boolean, default: true },
        allowCollaborativeGoals: { type: Boolean, default: true },
        allowGoalComments: { type: Boolean, default: true },
        allowUserMessaging: { type: Boolean, default: true },
        enableAchievements: { type: Boolean, default: true }
    },
    // Goal categories (default and custom)
    goalCategories: [{
        name: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
        icon: { type: String, default: 'star' },
        color: { type: String, default: '#FF8C00' },
        isActive: { type: Boolean, default: true }
    }],
    // App-wide announcements
    announcements: [{
        title: { type: String, required: true },
        message: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        isActive: { type: Boolean, default: true },
        priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: { type: Date, default: Date.now }
    }],
    // App version control
    version: {
        current: { type: String, default: '1.0.0' },
        minRequired: { type: String, default: '1.0.0' },
        latestAvailable: { type: String, default: '1.0.0' }
    },
    // General settings
    general: {
        maintenanceMode: { type: Boolean, default: false },
        maintenanceMessage: { type: String, default: 'We are currently performing maintenance. Please try again later.' },
        maxGoalsPerUser: { type: Number, default: 50 },
        maxCollaboratorsPerGoal: { type: Number, default: 10 }
    },
    // Last updated info
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure there's always exactly one settings document
appSettingsSchema.statics.getSettings = async function() {
    const settings = await this.findOne();
    if (settings) return settings;
    
    // Create default settings if none exist
    return this.create({
        features: {
            allowGoalSharing: true,
            allowCollaborativeGoals: true,
            allowGoalComments: true,
            allowUserMessaging: true,
            enableAchievements: true
        },
        goalCategories: [
            { name: 'Fitness', isDefault: true, icon: 'fitness', color: '#FF8C00', isActive: true },
            { name: 'Education', isDefault: true, icon: 'school', color: '#4285F4', isActive: true },
            { name: 'Career', isDefault: true, icon: 'work', color: '#34A853', isActive: true },
            { name: 'Finance', isDefault: true, icon: 'attach-money', color: '#FBBC05', isActive: true },
            { name: 'Personal', isDefault: true, icon: 'person', color: '#EA4335', isActive: true }
        ],
        announcements: [],
        version: {
            current: '1.0.0',
            minRequired: '1.0.0',
            latestAvailable: '1.0.0'
        },
        general: {
            maintenanceMode: false,
            maintenanceMessage: 'We are currently performing maintenance. Please try again later.',
            maxGoalsPerUser: 50,
            maxCollaboratorsPerGoal: 10
        }
    });
};

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);
export default AppSettings;