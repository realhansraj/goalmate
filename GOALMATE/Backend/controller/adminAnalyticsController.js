// adminAnalyticsController.js
import User from '../models/User.js';
import Goal from '../models/goalModel.js';
import Report from '../models/reportModel.js';
import mongoose from 'mongoose';

// Get overview statistics for the admin dashboard
export const getDashboardStats = async (req, res) => {
    try {
        // Count total users, goals, completed goals, and reports
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ accountStatus: 'Active' });
        const totalGoals = await Goal.countDocuments();
        const completedGoals = await Goal.countDocuments({ status: 'Completed' });
        const pendingReports = await Report.countDocuments({ status: 'Pending' });
        
        // Calculate completion rate
        const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
        
        // Get user growth data for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const userGrowth = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);
        
        // Get goal creation data for the last 6 months
        const goalCreation = await Goal.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);
        
        res.status(200).json({
            userStats: {
                total: totalUsers,
                active: activeUsers,
                growth: formatGrowthData(userGrowth)
            },
            goalStats: {
                total: totalGoals,
                completed: completedGoals,
                completionRate: completionRate.toFixed(2),
                growth: formatGrowthData(goalCreation)
            },
            moderationStats: {
                pendingReports
            }
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get detailed user statistics
export const getUserStats = async (req, res) => {
    try {
        // Get users by gender
        const genderDistribution = await User.aggregate([
            {
                $group: {
                    _id: '$gender',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Get users by account status
        const statusDistribution = await User.aggregate([
            {
                $group: {
                    _id: '$accountStatus',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Get most active users (by goal count)
        const activeUsers = await Goal.aggregate([
            {
                $group: {
                    _id: '$createdBy',
                    goalCount: { $sum: 1 },
                    completedGoals: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { goalCount: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $project: {
                    _id: 1,
                    name: '$userDetails.name',
                    email: '$userDetails.email',
                    profilePicture: '$userDetails.profilePicture',
                    goalCount: 1,
                    completedGoals: 1,
                    completionRate: {
                        $cond: [
                            { $gt: ['$goalCount', 0] },
                            { $multiply: [{ $divide: ['$completedGoals', '$goalCount'] }, 100] },
                            0
                        ]
                    }
                }
            }
        ]);
        
        res.status(200).json({
            genderDistribution,
            statusDistribution,
            activeUsers
        });
    } catch (error) {
        console.error('Error getting user stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get detailed goal statistics
export const getGoalStats = async (req, res) => {
    try {
        // Get goals by category
        const categoryDistribution = await Goal.aggregate([
            {
                $group: {
                    _id: '$goalCategory',
                    count: { $sum: 1 },
                    completed: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);
        
        // Get goals by type (Individual vs Group)
        const typeDistribution = await Goal.aggregate([
            {
                $group: {
                    _id: '$goalType',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // Completion rates by category
        const completionRates = categoryDistribution.map(category => ({
            category: category._id,
            completionRate: category.count > 0 
                ? (category.completed / category.count * 100).toFixed(2) 
                : 0
        }));
        
        // Get monthly completion rates for the past 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const monthlyCompletion = await Goal.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    total: { $sum: 1 },
                    completed: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            },
            {
                $project: {
                    _id: 1,
                    total: 1,
                    completed: 1,
                    completionRate: {
                        $cond: [
                            { $gt: ['$total', 0] },
                            { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
                            0
                        ]
                    }
                }
            }
        ]);
        
        res.status(200).json({
            categoryDistribution,
            typeDistribution,
            completionRates,
            monthlyCompletion: formatMonthlyCompletion(monthlyCompletion)
        });
    } catch (error) {
        console.error('Error getting goal stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Helper function to format growth data with month names
function formatGrowthData(data) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return data.map(item => ({
        month: months[item._id.month - 1],
        year: item._id.year,
        label: `${months[item._id.month - 1]} ${item._id.year}`,
        count: item.count
    }));
}

// Helper function to format monthly completion data
function formatMonthlyCompletion(data) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return data.map(item => ({
        month: months[item._id.month - 1],
        year: item._id.year,
        label: `${months[item._id.month - 1]} ${item._id.year}`,
        total: item.total,
        completed: item.completed,
        completionRate: parseFloat(item.completionRate.toFixed(2))
    }));
}

export default {
    getDashboardStats,
    getUserStats,
    getGoalStats
};