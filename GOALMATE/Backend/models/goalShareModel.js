import mongoose from 'mongoose';

const goalShareSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  friendUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Declined'],
    default: 'Pending'
  },
  message: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const GoalShare = mongoose.model('GoalShare', goalShareSchema);
export default GoalShare;