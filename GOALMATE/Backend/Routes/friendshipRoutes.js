import express from 'express';
import { 
  sendFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest, 
  getFriendsList, 
  getHiddenRequests, 
  getPendingRequests,
  getSentRequests,
  removeFriend
} from '../controller/friendshipController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Send friend request
router.post('/add', authMiddleware, sendFriendRequest);

// Accept friend request
router.post('/accept', authMiddleware, acceptFriendRequest);

// Decline friend request
router.post('/decline', authMiddleware, declineFriendRequest);

// Remove friend
router.post('/remove', authMiddleware, removeFriend);

// Get friends list
router.get('/friends', authMiddleware, getFriendsList);

// Get friend suggestions (people who are not in pending, declined status, or already friends)
router.get('/hidden', authMiddleware, getHiddenRequests);

// Get incoming pending friend requests
router.get('/getPendingRequests', authMiddleware, getPendingRequests);

// Get outgoing sent friend requests
router.get('/getSentRequests', authMiddleware, getSentRequests);

export default router;

