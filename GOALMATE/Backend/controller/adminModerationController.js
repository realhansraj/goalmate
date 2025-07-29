// adminModerationController.js
import Report from '../models/reportModel.js';
import Goal from '../models/goalModel.js';
import User from '../models/User.js';

// Get all reports with pagination and filters
export const getReports = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status || '';
        const type = req.query.type || '';
        
        const query = {};
        
        // Add status filter
        if (status) {
            query.status = status;
        }
        
        // Add type filter
        if (type) {
            query.targetType = type;
        }
        
        const total = await Report.countDocuments(query);
        const reports = await Report.find(query)
            .populate('reportedBy', 'name email profilePicture')
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        
        // Populate the target content details based on targetType
        for (let report of reports) {
            try {
                if (report.targetType === 'Goal') {
                    report._doc.targetDetails = await Goal.findById(report.targetId)
                        .select('title description goalCategory createdBy');
                    
                    if (report._doc.targetDetails) {
                        // Get the creator info
                        const creator = await User.findById(report._doc.targetDetails.createdBy)
                            .select('name email profilePicture');
                        report._doc.targetDetails._doc.creatorDetails = creator;
                    }
                } else if (report.targetType === 'User') {
                    report._doc.targetDetails = await User.findById(report.targetId)
                        .select('name email profilePicture');
                }
                // Add more types as needed
            } catch (err) {
                report._doc.targetDetails = { error: 'Content not found or deleted' };
            }
        }
        
        res.status(200).json({
            reports,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error getting reports:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get a specific report with details
export const getReportDetails = async (req, res) => {
    try {
        const reportId = req.params.id;
        
        const report = await Report.findById(reportId)
            .populate('reportedBy', 'name email profilePicture')
            .populate('reviewedBy', 'name email');
        
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        
        // Get more details about the reported content
        try {
            if (report.targetType === 'Goal') {
                report._doc.targetDetails = await Goal.findById(report.targetId)
                    .populate('createdBy', 'name email profilePicture');
            } else if (report.targetType === 'User') {
                report._doc.targetDetails = await User.findById(report.targetId)
                    .select('name email profilePicture accountStatus');
            }
            // Add more types as needed
        } catch (err) {
            report._doc.targetDetails = { error: 'Content not found or deleted' };
        }
        
        res.status(200).json(report);
    } catch (error) {
        console.error('Error getting report details:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update report status and take action
export const handleReport = async (req, res) => {
    try {
        const { reportId, status, actionTaken, reviewNotes } = req.body;
        
        if (!reportId || !status || !actionTaken) {
            return res.status(400).json({ message: 'Report ID, status, and action are required' });
        }
        
        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        
        // Update the report
        report.status = status;
        report.actionTaken = actionTaken;
        report.reviewNotes = reviewNotes || '';
        report.reviewedBy = req.userId;
        
        // Take action based on the decision
        if (actionTaken !== 'None') {
            try {
                if (report.targetType === 'Goal' && actionTaken === 'Content Removed') {
                    // Remove the goal
                    await Goal.findByIdAndDelete(report.targetId);
                } else if (report.targetType === 'User') {
                    const user = await User.findById(report.targetId);
                    if (user) {
                        if (actionTaken === 'User Suspended') {
                            user.accountStatus = 'Suspended';
                            await user.save();
                        } else if (actionTaken === 'User Banned') {
                            user.accountStatus = 'Banned';
                            await user.save();
                        }
                    }
                }
                // Add more actions for other content types
            } catch (err) {
                console.error('Error taking action:', err);
                // Continue with updating the report even if action fails
            }
        }
        
        await report.save();
        
        res.status(200).json({
            message: 'Report updated successfully',
            report
        });
    } catch (error) {
        console.error('Error handling report:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// For users to report content
export const createReport = async (req, res) => {
    try {
        const { targetType, targetId, reason, description } = req.body;
        
        if (!targetType || !targetId || !reason || !description) {
            return res.status(400).json({ 
                message: 'Target type, target ID, reason, and description are required' 
            });
        }
        
        // Validate target exists
        let targetExists = false;
        if (targetType === 'Goal') {
            const goal = await Goal.findById(targetId);
            targetExists = !!goal;
        } else if (targetType === 'User') {
            const user = await User.findById(targetId);
            targetExists = !!user;
        }
        // Add more types as needed
        
        if (!targetExists) {
            return res.status(404).json({ message: 'Reported content not found' });
        }
        
        // Check if user has already reported this content
        const existingReport = await Report.findOne({
            targetType,
            targetId,
            reportedBy: req.userId,
            status: { $in: ['Pending', 'Reviewed'] }
        });
        
        if (existingReport) {
            return res.status(400).json({ 
                message: 'You have already reported this content'
            });
        }
        
        const newReport = new Report({
            targetType,
            targetId,
            reportedBy: req.userId,
            reason,
            description
        });
        
        await newReport.save();
        
        res.status(201).json({
            message: 'Report submitted successfully',
            reportId: newReport._id
        });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export default {
    getReports,
    getReportDetails,
    handleReport,
    createReport
};