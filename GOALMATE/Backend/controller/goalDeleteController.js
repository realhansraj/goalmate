import GoalDeleteRequest from '../models/goalDeleteModel.js';
import Goal from '../models/goalModel.js';
import User from '../models/User.js';

// Request goal deletion
export const requestDeletion = async (req, res) => {
  try {
    const { goalId, reason } = req.body;
    const userId = req.userId;

    console.log("Delete request received for goal:", goalId);

    // Check if goal exists
    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    // Check if user is a participant or creator
    const isCreator = goal.createdBy.toString() === userId;
    const isParticipant = goal.participants.some(id => id.toString() === userId);

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: 'Not authorized to request deletion of this goal' });
    }

    // Check if there's an existing pending request
    const existingRequest = await GoalDeleteRequest.findOne({
      goalId,
      status: 'Pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'A deletion request for this goal is already pending' });
    }

    // Create a new deletion request
    // Get all participants + creator excluding requester
    const allParticipants = [goal.createdBy.toString(), ...goal.participants.map(p => p.toString())];
    const uniqueParticipants = [...new Set(allParticipants)].filter(id => id !== userId);

    const deletionRequest = new GoalDeleteRequest({
      goalId,
      requestedBy: userId,
      reason: reason || '',
      requiredApprovals: uniqueParticipants,
      responses: [] // Will be filled as people respond
    });

    await deletionRequest.save();
    console.log("Deletion request created:", deletionRequest);

    res.status(201).json({ 
      message: 'Deletion request created successfully',
      request: deletionRequest
    });
  } catch (error) {
    console.error('Error requesting goal deletion:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get pending deletion requests for user to approve/reject
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.userId;
    console.log("Fetching pending deletion requests for user:", userId);

    // Find requests where this user's approval is required
    const pendingRequests = await GoalDeleteRequest.find({
      requiredApprovals: userId,
      status: 'Pending'
    })
    .populate({
      path: 'goalId',
      select: 'title description goalType priority'
    })
    .populate({
      path: 'requestedBy',
      select: 'name profilePicture'
    });

    console.log("Found pending deletion requests:", pendingRequests.length);
    
    // Check for invalid requests (where goalId is null)
    const invalidRequestIds = [];
    
    for (const request of pendingRequests) {
      if (!request.goalId) {
        invalidRequestIds.push(request._id);
      }
    }
    
    // Asynchronously clean up invalid requests if any found
    if (invalidRequestIds.length > 0) {
      // Use a non-awaited promise to avoid delaying the response
      // The cleanup will happen in the background
      Promise.all(invalidRequestIds.map(requestId => 
        GoalDeleteRequest.findByIdAndDelete(requestId)
      )).catch(err => {
        console.error('Error cleaning up invalid deletion requests:', err);
      });
      
      console.log(`Cleaning up ${invalidRequestIds.length} invalid deletion requests`);
    }

    // Return all requests (frontend will handle null goals)
    res.status(200).json({ deletionRequests: pendingRequests });
  } catch (error) {
    console.error('Error fetching pending deletion requests:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Approve a deletion request
export const approveRequest = async (req, res) => {
  try {
    const { requestId, goalId } = req.body;
    const userId = req.userId;
    console.log("Approve deletion request:", requestId, "for goal:", goalId);

    const deletionRequest = await GoalDeleteRequest.findById(requestId);
    if (!deletionRequest) {
      return res.status(404).json({ message: 'Deletion request not found' });
    }

    // Check if this user's approval is required
    if (!deletionRequest.requiredApprovals.some(id => id.toString() === userId)) {
      return res.status(403).json({ message: 'Your approval is not required for this request' });
    }

    // Add this user's approval
    deletionRequest.responses.push({
      userId,
      response: 'Approved',
      respondedAt: new Date()
    });

    // Remove user from requiredApprovals
    deletionRequest.requiredApprovals = deletionRequest.requiredApprovals.filter(
      id => id.toString() !== userId
    );

    // If no more approvals needed, mark as approved and delete the goal
    if (deletionRequest.requiredApprovals.length === 0) {
      deletionRequest.status = 'Approved';
      
      // Delete the goal
      await Goal.findByIdAndDelete(goalId);
      console.log("Goal deleted:", goalId);
    }

    await deletionRequest.save();

    res.status(200).json({ 
      message: deletionRequest.status === 'Approved' 
        ? 'Goal deletion approved and goal deleted' 
        : 'Approval recorded, waiting for other participants'
    });
  } catch (error) {
    console.error('Error approving deletion request:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Reject a deletion request
export const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.userId;
    console.log("Reject deletion request:", requestId);

    const deletionRequest = await GoalDeleteRequest.findById(requestId);
    if (!deletionRequest) {
      return res.status(404).json({ message: 'Deletion request not found' });
    }

    // Check if this user's approval is required
    if (!deletionRequest.requiredApprovals.some(id => id.toString() === userId)) {
      return res.status(403).json({ message: 'Your response is not required for this request' });
    }

    // Add this user's rejection
    deletionRequest.responses.push({
      userId,
      response: 'Rejected',
      respondedAt: new Date()
    });

    // Mark request as rejected since one rejection is enough to cancel
    deletionRequest.status = 'Rejected';
    await deletionRequest.save();

    res.status(200).json({ message: 'Goal deletion request rejected' });
  } catch (error) {
    console.error('Error rejecting deletion request:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};