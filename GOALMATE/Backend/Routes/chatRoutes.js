import express from 'express';
import {
  getConversations,
  getOrCreateConversation,
  sendMessage,
  markAsRead,
  getMoreMessages,
  getOrCreateGoalConversation,
  getConversationById

} from '../controller/chatController.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();
// Get all conversations for current user
router.get('/conversations', authMiddleware, getConversations);
// Get or create a conversation with a friend
router.get('/conversations/:friendId', authMiddleware, getOrCreateConversation);
// Send a message
router.post('/messages', authMiddleware, sendMessage);
// Mark messages as read in a conversation
router.put('/conversations/:conversationId/read', authMiddleware, markAsRead);
// Get more messages for pagination
router.get('/conversations/:conversationId/messages', authMiddleware, getMoreMessages);
// Add these routes to your chatRoutes.js file
// Get conversation by ID
router.get('/conversations/:conversationId/details', authMiddleware, getConversationById);

// Get or create a goal-specific group conversation
router.get('/goal-conversation/:goalId', authMiddleware, getOrCreateGoalConversation);
export default router;