// profileRoutes.js
import express from 'express';
import { 
  getProfile, 
  updateProfile, 
  updateUserInfo, 
  getProfileStats, 
  updatePassword, 
  deleteAccount,
  updateNotificationSettings
} from '../controller/profileController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { uploadFiles } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user profile
router.get('/me', getProfile);

// Update profile information
router.put('/update', uploadFiles, updateProfile);

// Update user info (name, email, etc.)
router.put('/user-info', uploadFiles, updateUserInfo);

// Get profile statistics
router.get('/stats', getProfileStats);

// Update password
router.put('/password', updatePassword);

// Delete account
router.delete('/delete', deleteAccount);

// Update notification settings
router.patch('/notification-settings', updateNotificationSettings);

export default router;