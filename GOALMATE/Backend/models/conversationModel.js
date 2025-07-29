// Update your conversationModel.js to include these fields

import mongoose from 'mongoose';
const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  // New fields for goal-based group chats
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    default: null
  },
  isGroupChat: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });
const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;