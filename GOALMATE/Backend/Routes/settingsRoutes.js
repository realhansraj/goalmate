// In /Backend/Routes/settingsRoutes.js
import express from 'express';
import adminSettingsController from '../controller/adminSettingsController.js';

const router = express.Router();

// Public settings route - no auth required so all users can access settings
router.get('/', adminSettingsController.getAppSettings);

export default router;