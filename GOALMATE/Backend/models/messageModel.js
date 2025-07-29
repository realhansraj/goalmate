// models/messageModel.js
import mongoose from 'mongoose';
const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attachments: [{
    type: String,
    default: []
  }]
}, { timestamps: true });
const Message = mongoose.model('Message', messageSchema);
export default Message;