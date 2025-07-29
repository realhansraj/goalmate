import express from 'express';
import { 
  requestDeletion, 
  getPendingRequests, 
  approveRequest, 
  rejectRequest 
} from '../controller/goalDeleteController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/request', authMiddleware, requestDeletion);
router.get('/pending', authMiddleware, getPendingRequests);
router.post('/approve', authMiddleware, approveRequest);
router.post('/reject', authMiddleware, rejectRequest);

export default router;