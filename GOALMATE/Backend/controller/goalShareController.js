// /Users/admin/Documents/GOALMATE/Backend/controller/goalShareController.js
import GoalShare from '../models/goalShareModel.js';
import Goal from '../models/goalModel.js';
import User from '../models/User.js';
import Friendship from '../models/friendshipModel.js';

// Share a goal with a friend
export const shareGoal = async (req, res) => {
  try {
    const { goalId, friendUserId } = req.body;

    // Check if the goal exists
    const goal = await Goal.findById(goalId);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    // Get the logged-in user's ID
    const userId = req.userId;

    // Check if the user is trying to share the goal with themselves
    if (userId === friendUserId) {
      return res.status(400).json({ message: "You can't share a goal with yourself" });
    }

    // Check if the friend exists in the user's friend list
    const friendRequest = await Friendship.findOne({
      userId,
      friendId: friendUserId,
      status: 'Accepted',
    });

    if (!friendRequest) {
      return res.status(400).json({ message: 'Friend request is not accepted or does not exist' });
    }

    // Check if the goal has already been shared with this friend
    const existingShare = await GoalShare.findOne({ goalId, friendUserId });
    if (existingShare) {
      return res.status(400).json({ message: 'Goal already shared with this friend' });
    }

    // Create a new GoalShare document to associate the goal with the friend
    const newGoalShare = new GoalShare({
      goalId,
      userId,
      friendUserId,
    });

    await newGoalShare.save();

    res.status(201).json({ message: 'Goal shared successfully', goalShare: newGoalShare });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Accept a shared goal
export const acceptGoalShare = async (req, res) => {
  try {
    const { goalShareId } = req.body;
    console.log("Accept goal share request:", goalShareId);
    
    const goalShare = await GoalShare.findById(goalShareId);

    if (!goalShare) return res.status(404).json({ message: 'Goal Share request not found' });

    // Only the friend user can accept the request
    if (goalShare.friendUserId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    // Change status to accepted
    goalShare.status = 'Accepted';
    await goalShare.save();
    
    // Add the user to the goal participants if not already there
    const goal = await Goal.findById(goalShare.goalId);
    if (goal) {
      // Convert participants to strings for comparison
      const participantStrings = goal.participants.map(p => 
        typeof p === 'object' && p._id ? p._id.toString() : p.toString()
      );
      
      console.log("Current participants:", participantStrings);
      console.log("Adding user:", req.userId);
      
      // Add user only if not already a participant
      if (!participantStrings.includes(req.userId)) {
        goal.participants.push(req.userId);
        
        // For compete type goals, initialize individual progress
        if (goal.collaborativeType === 'compete') {
          // Check if user already has progress entry
          const hasProgressEntry = goal.individualProgress.some(
            p => (p.userId && p.userId.toString() === req.userId) || p.userId === req.userId
          );
          
          if (!hasProgressEntry) {
            goal.individualProgress.push({
              userId: req.userId,
              completionPercentage: 0,
              totalProgress: 0,
              lastUpdated: new Date()
            });
          }
        }
        
        await goal.save();
        console.log(`Added user ${req.userId} to goal participants. Updated goal:`, goal);
      } else {
        console.log(`User ${req.userId} is already a participant in goal ${goal._id}`);
      }
    }

    res.status(200).json({ message: 'Goal share accepted successfully', goalShare });
  } catch (error) {
    console.error("Error accepting goal share:", error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Decline a shared goal
export const declineGoalShare = async (req, res) => {
  try {
    const { goalShareId } = req.body;
    const goalShare = await GoalShare.findById(goalShareId)
      .populate('goalId', 'title')
      .populate('userId', 'name');
  
    if (!goalShare) return res.status(404).json({ message: 'Goal Share request not found' });
  
    // Only the friend user can decline the request
    if (goalShare.friendUserId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to decline this request' });
    }
  
    // Change status to declined
    goalShare.status = 'Declined';
    await goalShare.save();
    
    // Get the declining user's name for the notification
    const decliningUser = await User.findById(req.userId, 'name');
    
    // You could implement a notification system here
    // For now, we'll just return info that the goal creator was notified
    
    res.status(200).json({ 
      message: 'Goal share declined successfully', 
      goalShare,
      creatorNotified: true,
      declineInfo: {
        goalTitle: goalShare.goalId.title,
        declinedBy: decliningUser ? decliningUser.name : 'A user',
        creatorId: goalShare.userId
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get shared goals for the user
export const getSharedGoals = async (req, res) => {
  try {
    const userId = req.userId;
  
    // Find shared goals where the user is either the one who shared or the one who received the share
    const sharedGoals = await GoalShare.find({
      $or: [
        { userId: userId },       // Goals shared by the user
        { friendUserId: userId }  // Goals shared with the user
      ]
    })
      .populate('goalId')
      .populate('friendUserId');
  
    if (!sharedGoals || sharedGoals.length === 0) {
      return res.status(404).json({ message: 'No shared goals found' });
    }
  
    res.status(200).json({ sharedGoals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get pending goal requests for the user
export const getPendingGoalRequests = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find goal shares where user is the recipient and status is Pending
    const pendingShares = await GoalShare.find({
      friendUserId: userId,
      status: 'Pending'
    })
      .populate({
        path: 'goalId',
        select: 'title description goalType collaborativeType priority startDate endDate subTasks'
      })
      .populate({
        path: 'userId',
        select: 'name profilePicture'
      });
    
    if (!pendingShares || pendingShares.length === 0) {
      return res.status(200).json({ message: 'No pending goal requests', goalShares: [] });
    }
    
    // Filter out any shares where the goal no longer exists (likely deleted)
    // Also keep track of invalid share IDs to clean them up in the database
    const validShares = [];
    const invalidShareIds = [];
    
    for (const share of pendingShares) {
      if (share.goalId) {
        validShares.push(share);
      } else {
        invalidShareIds.push(share._id);
      }
    }
    
    // Asynchronously clean up invalid shares if any found
    if (invalidShareIds.length > 0) {
      // Use a non-awaited promise to avoid delaying the response
      // The cleanup will happen in the background
      Promise.all(invalidShareIds.map(shareId => 
        GoalShare.findByIdAndDelete(shareId)
      )).catch(err => {
        console.error('Error cleaning up invalid goal shares:', err);
      });
      
      console.log(`Cleaned up ${invalidShareIds.length} invalid goal share requests`);
    }
    
    res.status(200).json({ goalShares: pendingShares });
  } catch (error) {
    console.error('Error fetching pending goal requests:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};