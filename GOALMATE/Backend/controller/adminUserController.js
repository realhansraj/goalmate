// adminUserController.js
import User from '../models/User.js';
import Goal from '../models/goalModel.js';
import PremiumRequest from '../models/premiumRequestModel.js';

// Get all users with pagination, search, and filters
export const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        
        const query = {};
        
        // Add search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Add status filter
        if (status) {
            query.accountStatus = status;
        }
        
        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password') // Exclude password
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        
        res.status(200).json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get user details with activity stats
export const getUserDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Get user details excluding password
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Get goal stats
        const totalGoals = await Goal.countDocuments({ createdBy: userId });
        const completedGoals = await Goal.countDocuments({ 
            createdBy: userId, 
            status: 'Completed' 
        });
        
        // Get goal categories breakdown
        const goalCategories = await Goal.aggregate([
            { $match: { createdBy: userId } },
            { $group: { _id: '$goalCategory', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        const stats = {
            totalGoals,
            completedGoals,
            completionRate: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0,
            categories: goalCategories
        };
        
        res.status(200).json({ user, stats });
    } catch (error) {
        console.error('Error getting user details:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update user account status (suspend/ban/activate)
export const updateUserStatus = async (req, res) => {
    try {
        const { userId, status, reason } = req.body;
        
        if (!userId || !status) {
            return res.status(400).json({ message: 'User ID and status are required' });
        }
        
        if (!['Active', 'Suspended', 'Banned'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Don't allow changing status of other admins
        if (user.isAdmin && status !== 'Active') {
            return res.status(403).json({ message: 'Cannot modify another admin account' });
        }
        
        user.accountStatus = status;
        await user.save();
        
        res.status(200).json({ 
            message: `User status updated to ${status}`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                status: user.accountStatus
            }
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Toggle admin status for a user
export const toggleAdminStatus = async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Toggle the admin status
        user.isAdmin = !user.isAdmin;
        await user.save();
        
        res.status(200).json({ 
            message: `Admin status ${user.isAdmin ? 'granted to' : 'revoked from'} user`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Error toggling admin status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// List all premium requests (optionally filter by status)
export const listPremiumRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await PremiumRequest.find(filter).populate('userId', 'name email');
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching premium requests', error: error.message });
  }
};

// Approve a premium request
export const approvePremiumRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await PremiumRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });
    // Set user as premium
    const user = await User.findById(request.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isPremium = true;
    await user.save();
    request.status = 'approved';
    await request.save();
    res.status(200).json({ message: 'Request approved and user upgraded to premium.' });
  } catch (error) {
    res.status(500).json({ message: 'Error approving request', error: error.message });
  }
};

// Reject a premium request
export const rejectPremiumRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await PremiumRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });
    request.status = 'rejected';
    await request.save();
    res.status(200).json({ message: 'Request rejected.' });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting request', error: error.message });
  }
};

export default {
    getAllUsers,
    getUserDetails,
    updateUserStatus,
    toggleAdminStatus,
    listPremiumRequests,
    approvePremiumRequest,
    rejectPremiumRequest
};