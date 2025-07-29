import mongoose from 'mongoose';

const goalDeleteRequestSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  reason: {
    type: String,
    default: ''
  },
  // Keep track of who has approved/rejected
  responses: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    response: {
      type: String,
      enum: ['Approved', 'Rejected']
    },
    respondedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // All participants must approve for deletion
  requiredApprovals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

const GoalDeleteRequest = mongoose.model('GoalDeleteRequest', goalDeleteRequestSchema);
export default GoalDeleteRequest;