import express from 'express';
import { 
  shareGoal, 
  acceptGoalShare, 
  declineGoalShare, 
  getSharedGoals,
  getPendingGoalRequests 
} from '../controller/goalShareController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/share', authMiddleware, shareGoal);
router.post('/accept', authMiddleware, acceptGoalShare);
router.post('/decline', authMiddleware, declineGoalShare);
router.get('/shared', authMiddleware, getSharedGoals);
router.get('/pending', authMiddleware, getPendingGoalRequests);

export default router;