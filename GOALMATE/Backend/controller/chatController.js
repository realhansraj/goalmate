// controller/chatController.js
import Conversation from '../models/conversationModel.js';
import Message from '../models/messageModel.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import Goal from '../models/goalModel.js';


// Get all conversations for the current user
export const getConversations = async (req, res) => {
  try {
    const userId = req.userId;
    
    const conversations = await Conversation.find({
      participants: userId
    })
    .populate({
      path: 'participants',
      select: 'name email profilePicture',
      match: { _id: { $ne: userId } }
    })
    .populate({
      path: 'lastMessage',
      select: 'content sender createdAt readBy'
    })
    .sort({ updatedAt: -1 });

    // Format the conversations data for the frontend
    const formattedConversations = conversations.map(conv => {
      // Check if this is a group chat
      const isGroupChat = conv.goalId !== undefined && conv.goalId !== null;
      const unreadCount = conv.unreadCount.get(userId.toString()) || 0;
      
      // For group chats, add different properties
      if (isGroupChat) {
        return {
          _id: conv._id,
          goalId: conv.goalId,
          title: conv.title || "Group Chat",
          isGroupChat: true,
          participants: conv.participants, // All participants except current user
          lastMessage: conv.lastMessage,
          unreadCount: unreadCount,
          updatedAt: conv.updatedAt
        };
      } 
      
      // For regular 1-on-1 chats
      const otherParticipant = conv.participants[0];
      
      return {
        _id: conv._id,
        participant: otherParticipant,
        lastMessage: conv.lastMessage,
        unreadCount: unreadCount,
        updatedAt: conv.updatedAt
      };
    });

    return res.status(200).json({ conversations: formattedConversations });
  } catch (error) {
    console.error("Error getting conversations:", error);
    return res.status(500).json({ message: "Error retrieving conversations", error: error.message });
  }
};

// Get or create a conversation with a friend
export const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { friendId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: "Invalid friend ID" });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, friendId] }
    })
    .populate({
      path: 'participants',
      select: 'name email profilePicture',
      match: { _id: { $ne: userId } }
    });

    // If no conversation exists, create a new one
    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, friendId],
        unreadCount: new Map([[userId.toString(), 0], [friendId.toString(), 0]])
      });
      await conversation.save();
      
      // Populate the participants after saving
      conversation = await Conversation.findById(conversation._id)
        .populate({
          path: 'participants',
          select: 'name email profilePicture',
          match: { _id: { $ne: userId } }
        });
    }

    // Get messages for this conversation
    const messages = await Message.find({ conversationId: conversation._id })
      .populate('sender', 'name email profilePicture')
      .sort({ createdAt: 1 });

    // Mark all messages as read by the current user
    await Message.updateMany(
      { 
        conversationId: conversation._id,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      },
      { $addToSet: { readBy: userId } }
    );

    // Reset unread count for the current user
    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();

    const otherParticipant = conversation.participants[0];

    return res.status(200).json({
      conversation: {
        _id: conversation._id,
        participant: otherParticipant,
        messages
      }
    });
  } catch (error) {
    console.error("Error getting or creating conversation:", error);
    return res.status(500).json({ message: "Error retrieving conversation", error: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId, content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: "Message content cannot be empty" });
    }

    // Find the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Ensure the user is part of the conversation
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ message: "You're not part of this conversation" });
    }

    // Create and save the new message
    const message = new Message({
      conversationId,
      sender: userId,
      content,
      readBy: [userId] // Sender has read their own message
    });
    await message.save();

    // Populate message with sender info
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email profilePicture');

    // Update conversation with last message and timestamp
    conversation.lastMessage = message._id;
    conversation.updatedAt = Date.now();

    // Increment unread count for all participants except the sender
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== userId.toString()) {
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });
    
    await conversation.save();

    return res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ message: "Error sending message", error: error.message });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    // Update all unread messages in this conversation as read
    await Message.updateMany(
      { 
        conversationId, 
        sender: { $ne: userId },
        readBy: { $ne: userId }
      },
      { $addToSet: { readBy: userId } }
    );

    // Reset unread count for this user
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.unreadCount.set(userId.toString(), 0);
      await conversation.save();
    }

    return res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return res.status(500).json({ message: "Error updating read status", error: error.message });
  }
};

// Get more messages (for pagination)
export const getMoreMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    const { before } = req.query;
    const limit = parseInt(req.query.limit) || 20;

    // Ensure the user is part of the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({ message: "You don't have access to this conversation" });
    }

    // Query conditions
    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Get messages for pagination
    const messages = await Message.find(query)
      .populate('sender', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error getting more messages:", error);
    return res.status(500).json({ message: "Error retrieving messages", error: error.message });
  }
};

// Get or create a goal-specific group conversation
export const getOrCreateGoalConversation = async (req, res) => {
  try {
    const userId = req.userId;
    const { goalId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return res.status(400).json({ message: "Invalid goal ID" });
    }
    
    // Find the goal
    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }
    
    // Check if user has access to the goal
    const isCreator = goal.createdBy.toString() === userId;
    const isParticipant = goal.participants.some(p => p.toString() === userId);
    
    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: "You don't have access to this goal" });
    }
    
    // Check if a conversation for this goal already exists
    let conversation = await Conversation.findOne({
      goalId: goalId
    });
    
    // If no conversation exists, create a new group conversation
    if (!conversation) {
      // Get all participants including the creator
      const allParticipants = [goal.createdBy, ...goal.participants];
      
      // Remove duplicates
      const uniqueParticipants = [...new Set(allParticipants.map(id => id.toString()))];
      
      // Create new conversation
      conversation = new Conversation({
        participants: uniqueParticipants,
        goalId: goalId,
        isGroupChat: true,
        title: goal.title || "Group Chat",
        unreadCount: new Map()
      });
      
      // Initialize unread counts to zero for all participants
      uniqueParticipants.forEach(participantId => {
        conversation.unreadCount.set(participantId.toString(), 0);
      });
      
      await conversation.save();
    }
    
    // Retrieve messages for the conversation
    const messages = await Message.find({ conversationId: conversation._id })
      .populate('sender', 'name email profilePicture')
      .sort({ createdAt: 1 });
    
    // Mark messages as read
    await Message.updateMany(
      {
        conversationId: conversation._id,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      },
      { $addToSet: { readBy: userId } }
    );
    
    // Reset unread count for the current user
    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();
    
    return res.status(200).json({
      conversation: {
        _id: conversation._id,
        goalId: conversation.goalId,
        isGroupChat: true,
        title: goal.title || "Group Chat",
        messages: messages
      }
    });
  } catch (error) {
    console.error("Error getting or creating goal conversation:", error);
    return res.status(500).json({ message: "Error retrieving conversation", error: error.message });
  }
};
// Get conversation details by conversation ID
export const getConversationById = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    
    // Fetch the conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    
    // Check if user is a participant
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ message: "You don't have access to this conversation" });
    }
    
    // Get the other participants
    const populatedConv = await Conversation.findById(conversationId).populate({
      path: 'participants',
      select: 'name email profilePicture',
      match: { _id: { $ne: userId } }
    });
    
    // Get messages
    const messages = await Message.find({ conversationId })
      .populate('sender', 'name email profilePicture')
      .sort({ createdAt: 1 });
    
    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      },
      { $addToSet: { readBy: userId } }
    );
    
    // Reset unread count
    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();
    
    // Format response based on conversation type
    const isGroupChat = conversation.goalId || conversation.isGroupChat;
    
    if (isGroupChat) {
      return res.status(200).json({
        conversation: {
          _id: conversation._id,
          goalId: conversation.goalId,
          isGroupChat: true,
          title: conversation.title || "Group Chat",
          messages: messages
        }
      });
    } else {
      const otherParticipant = populatedConv.participants[0] || { name: "Unknown User" };
      
      return res.status(200).json({
        conversation: {
          _id: conversation._id,
          participant: otherParticipant,
          messages: messages
        }
      });
    }
  } catch (error) {
    console.error("Error getting conversation:", error);
    return res.status(500).json({ message: "Error retrieving conversation", error: error.message });
  }
};