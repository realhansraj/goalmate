// /Users/admin/Documents/GOALMATE/Backend/Routes/goalRoutes.js
import express from 'express';
import { createGoal, getUserGoals, getGoalById, updateGoal, deleteGoal, shareGoal, getSharedGoals, leaveSharedGoal, updateGoalProgress, updateSubTaskStatus } from '../controller/goalController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Make sure these paths match your frontend API calls
router.post('/create', authMiddleware, createGoal);
router.get('/', authMiddleware, getUserGoals);
router.get('/:id', authMiddleware, getGoalById);
router.put('/:id', authMiddleware, updateGoal);
router.delete('/:id', authMiddleware, deleteGoal);

// Add the new endpoints for collaborative features
router.post('/share', authMiddleware, shareGoal);
router.get('/shared', authMiddleware, getSharedGoals);
router.post('/:id/leave', authMiddleware, leaveSharedGoal);
router.post('/:id/progress', authMiddleware, updateGoalProgress);

// New endpoint for updating sub-task status
router.post('/subtask/status', authMiddleware, updateSubTaskStatus);

export default router;