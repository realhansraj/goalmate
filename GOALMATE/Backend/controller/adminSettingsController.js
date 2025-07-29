// adminSettingsController.js
import AppSettings from '../models/appSettingsModel.js';

// Get all app settings
export const getAppSettings = async (req, res) => {
    try {
        console.log('Fetching app settings...');
        const settings = await AppSettings.getSettings();
        console.log('App settings fetched successfully');
        res.status(200).json(settings);
    } catch (error) {
        console.error('Error getting app settings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update feature toggles
export const updateFeatures = async (req, res) => {
    try {
        const { features } = req.body;
        
        if (!features) {
            return res.status(400).json({ message: 'Features data is required' });
        }
        
        const settings = await AppSettings.getSettings();
        
        // Update only the provided feature toggles
        Object.keys(features).forEach(key => {
            if (settings.features.hasOwnProperty(key)) {
                settings.features[key] = features[key];
            }
        });
        
        settings.lastUpdated = new Date();
        settings.updatedBy = req.userId;
        
        await settings.save();
        
        res.status(200).json({
            message: 'Features updated successfully',
            features: settings.features
        });
    } catch (error) {
        console.error('Error updating features:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Manage goal categories
export const getGoalCategories = async (req, res) => {
    try {
        const settings = await AppSettings.getSettings();
        res.status(200).json(settings.goalCategories);
    } catch (error) {
        console.error('Error getting goal categories:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const addGoalCategory = async (req, res) => {
    try {
        const { name, icon, color } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Category name is required' });
        }
        
        const settings = await AppSettings.getSettings();
        
        // Check if category with same name already exists
        const categoryExists = settings.goalCategories.some(
            cat => cat.name.toLowerCase() === name.toLowerCase()
        );
        
        if (categoryExists) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }
        
        // Add new category
        settings.goalCategories.push({
            name,
            icon: icon || 'star',
            color: color || '#FF8C00',
            isDefault: false,
            isActive: true
        });
        
        settings.lastUpdated = new Date();
        settings.updatedBy = req.userId;
        
        await settings.save();
        
        res.status(201).json({
            message: 'Goal category added successfully',
            category: settings.goalCategories[settings.goalCategories.length - 1]
        });
    } catch (error) {
        console.error('Error adding goal category:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updateGoalCategory = async (req, res) => {
    try {
        const { categoryId, name, icon, color, isActive } = req.body;
        
        if (!categoryId) {
            return res.status(400).json({ message: 'Category ID is required' });
        }
        
        const settings = await AppSettings.getSettings();
        
        // Find the category
        const categoryIndex = settings.goalCategories.findIndex(
            cat => cat._id.toString() === categoryId
        );
        
        if (categoryIndex === -1) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        // Update category fields
        if (name) settings.goalCategories[categoryIndex].name = name;
        if (icon) settings.goalCategories[categoryIndex].icon = icon;
        if (color) settings.goalCategories[categoryIndex].color = color;
        if (isActive !== undefined) settings.goalCategories[categoryIndex].isActive = isActive;
        
        settings.lastUpdated = new Date();
        settings.updatedBy = req.userId;
        
        await settings.save();
        
        res.status(200).json({
            message: 'Goal category updated successfully',
            category: settings.goalCategories[categoryIndex]
        });
    } catch (error) {
        console.error('Error updating goal category:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Manage announcements
export const getAnnouncements = async (req, res) => {
    try {
        const settings = await AppSettings.getSettings();
        const announcements = settings.announcements.sort((a, b) => b.createdAt - a.createdAt);
        
        res.status(200).json(announcements);
    } catch (error) {
        console.error('Error getting announcements:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const addAnnouncement = async (req, res) => {
    try {
        const { title, message, startDate, endDate, priority, isActive } = req.body;
        
        if (!title || !message || !startDate || !endDate) {
            return res.status(400).json({ 
                message: 'Title, message, start date, and end date are required' 
            });
        }
        
        const settings = await AppSettings.getSettings();
        
        // Create new announcement
        const newAnnouncement = {
            title,
            message,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            priority: priority || 'Medium',
            isActive: isActive !== undefined ? isActive : true,
            createdBy: req.userId,
            createdAt: new Date()
        };
        
        settings.announcements.push(newAnnouncement);
        settings.lastUpdated = new Date();
        settings.updatedBy = req.userId;
        
        await settings.save();
        
        res.status(201).json({
            message: 'Announcement added successfully',
            announcement: newAnnouncement
        });
    } catch (error) {
        console.error('Error adding announcement:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updateAnnouncement = async (req, res) => {
    try {
        const { announcementId, title, message, startDate, endDate, priority, isActive } = req.body;
        
        if (!announcementId) {
            return res.status(400).json({ message: 'Announcement ID is required' });
        }
        
        const settings = await AppSettings.getSettings();
        
        // Find the announcement
        const announcementIndex = settings.announcements.findIndex(
            a => a._id.toString() === announcementId
        );
        
        if (announcementIndex === -1) {
            return res.status(404).json({ message: 'Announcement not found' });
        }
        
        // Update announcement fields
        if (title) settings.announcements[announcementIndex].title = title;
        if (message) settings.announcements[announcementIndex].message = message;
        if (startDate) settings.announcements[announcementIndex].startDate = new Date(startDate);
        if (endDate) settings.announcements[announcementIndex].endDate = new Date(endDate);
        if (priority) settings.announcements[announcementIndex].priority = priority;
        if (isActive !== undefined) settings.announcements[announcementIndex].isActive = isActive;
        
        settings.lastUpdated = new Date();
        settings.updatedBy = req.userId;
        
        await settings.save();
        
        res.status(200).json({
            message: 'Announcement updated successfully',
            announcement: settings.announcements[announcementIndex]
        });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const deleteAnnouncement = async (req, res) => {
    try {
        const { announcementId } = req.params;
        
        if (!announcementId) {
            return res.status(400).json({ message: 'Announcement ID is required' });
        }
        
        const settings = await AppSettings.getSettings();
        
        // Find and remove the announcement
        const initialLength = settings.announcements.length;
        settings.announcements = settings.announcements.filter(
            a => a._id.toString() !== announcementId
        );
        
        if (settings.announcements.length === initialLength) {
            return res.status(404).json({ message: 'Announcement not found' });
        }
        
        settings.lastUpdated = new Date();
        settings.updatedBy = req.userId;
        
        await settings.save();
        
        res.status(200).json({
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update general settings
export const updateGeneralSettings = async (req, res) => {
    try {
        const { general } = req.body;
        
        if (!general) {
            return res.status(400).json({ message: 'General settings data is required' });
        }
        
        const settings = await AppSettings.getSettings();
        
        // Update only the provided general settings
        Object.keys(general).forEach(key => {
            if (settings.general.hasOwnProperty(key)) {
                settings.general[key] = general[key];
            }
        });
        
        settings.lastUpdated = new Date();
        settings.updatedBy = req.userId;
        
        await settings.save();
        
        res.status(200).json({
            message: 'General settings updated successfully',
            general: settings.general
        });
    } catch (error) {
        console.error('Error updating general settings:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update app version
export const updateAppVersion = async (req, res) => {
    try {
        const { current, minRequired, latestAvailable } = req.body;
        
        if (!current && !minRequired && !latestAvailable) {
            return res.status(400).json({ message: 'At least one version field is required' });
        }
        
        const settings = await AppSettings.getSettings();
        
        // Update version fields
        if (current) settings.version.current = current;
        if (minRequired) settings.version.minRequired = minRequired;
        if (latestAvailable) settings.version.latestAvailable = latestAvailable;
        
        settings.lastUpdated = new Date();
        settings.updatedBy = req.userId;
        
        await settings.save();
        
        res.status(200).json({
            message: 'App version updated successfully',
            version: settings.version
        });
    } catch (error) {
        console.error('Error updating app version:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export default {
    getAppSettings,
    updateFeatures,
    getGoalCategories,
    addGoalCategory,
    updateGoalCategory,
    getAnnouncements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    updateGeneralSettings,
    updateAppVersion
};