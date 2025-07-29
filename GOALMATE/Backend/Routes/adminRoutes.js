// adminRoutes.js
import express from 'express';
import adminMiddleware from '../middleware/adminMiddleware.js';
import adminUserController from '../controller/adminUserController.js';
import adminModerationController from '../controller/adminModerationController.js';
import adminAnalyticsController from '../controller/adminAnalyticsController.js';
import adminSettingsController from '../controller/adminSettingsController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes are protected by the admin middleware
router.use(adminMiddleware);

// User Management Routes
router.get('/users', adminUserController.getAllUsers);
router.get('/users/:id', adminUserController.getUserDetails);
router.post('/users/status', adminUserController.updateUserStatus);
router.post('/users/admin-status', adminUserController.toggleAdminStatus);
router.get('/premium-requests', adminUserController.listPremiumRequests);
router.post('/premium-requests/:id/approve', adminUserController.approvePremiumRequest);
router.post('/premium-requests/:id/reject', adminUserController.rejectPremiumRequest);

// Content Moderation Routes
router.get('/reports', adminModerationController.getReports);
router.get('/reports/:id', adminModerationController.getReportDetails);
router.post('/reports/handle', adminModerationController.handleReport);

// Analytics Routes
router.get('/analytics/dashboard', adminAnalyticsController.getDashboardStats);
router.get('/analytics/users', adminAnalyticsController.getUserStats);
router.get('/analytics/goals', adminAnalyticsController.getGoalStats);

// Settings Routes
router.get('/settings', adminSettingsController.getAppSettings);
router.put('/settings/features', adminSettingsController.updateFeatures);
router.get('/settings/goal-categories', adminSettingsController.getGoalCategories);
router.post('/settings/goal-categories', adminSettingsController.addGoalCategory);
router.put('/settings/goal-categories', adminSettingsController.updateGoalCategory);
router.get('/settings/announcements', adminSettingsController.getAnnouncements);
router.post('/settings/announcements', adminSettingsController.addAnnouncement);
router.put('/settings/announcements', adminSettingsController.updateAnnouncement);
router.delete('/settings/announcements/:announcementId', adminSettingsController.deleteAnnouncement);
router.put('/settings/general', adminSettingsController.updateGeneralSettings);
router.put('/settings/version', adminSettingsController.updateAppVersion);

// Regular user report submission route (this should be in a separate file, but included here for completeness)
const reportRoutes = express.Router();
reportRoutes.post('/reports', authMiddleware, adminModerationController.createReport);

export { reportRoutes };
export default router;