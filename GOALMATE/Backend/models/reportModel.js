// reportModel.js
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    targetType: {
        type: String,
        enum: ['Goal', 'Comment', 'User'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'targetType'
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        enum: ['Inappropriate Content', 'Harassment', 'Spam', 'Offensive Language', 'Other'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Reviewed', 'Resolved', 'Dismissed'],
        default: 'Pending'
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    actionTaken: {
        type: String,
        enum: ['None', 'Content Removed', 'Warning Issued', 'User Suspended', 'User Banned'],
        default: 'None'
    },
    reviewNotes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Create indexes for better query performance
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ reportedBy: 1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;