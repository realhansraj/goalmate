// /Users/admin/Documents/GOALMATE/Backend/controller/goalController.js

import Goal from '../models/goalModel.js';
import User from '../models/User.js'; // Changed from userModel.js to User.js
import GoalShare from '../models/goalShareModel.js';

export const createGoal = async (req, res) => {
  const { 
    title, 
    description, 
    goalType,
    collaborativeType,
    goalCategory, 
    frequency, 
    startDate, 
    endDate, 
    progressFrequency, 
    priority, 
    status,
    // Fitness specific fields
    fitnessType,
    duration,
    distance,
    sets,
    reps,
    weight,
    // Education specific fields
    educationType,
    studyHours,
    pages,
    modules,
    testScore,
    // New: sub-tasks for achieve-together type
    subTasks
  } = req.body;

  try {
    // Basic validation - instead of using validationResult
    if (!title || !description || !goalCategory) {
      return res.status(400).json({ 
        errors: [{ msg: 'Title, description and goal category are required' }] 
      });
    }

    // Check if user is premium and limit goal creation for non-premium users
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }
    if (!user.isPremium) {
      const userGoalCount = await Goal.countDocuments({ createdBy: req.userId });
      if (userGoalCount >= 3) {
        return res.status(403).json({ msg: 'Goal creation limit reached. Upgrade to premium to create more goals.' });
      }
    }

    // Create the base goal object
    const newGoal = new Goal({
      title,
      description,
      goalType,
      collaborativeType: goalType === 'Collaborative' ? collaborativeType : null,
      goalCategory,
      frequency,
      startDate: startDate || new Date(),
      endDate,
      progressFrequency,
      priority,
      status: status || 'Not Started',
      createdBy: req.userId,
    });

    // Add sub-tasks if provided (for achieve-together type)
    if (collaborativeType === 'achieve-together' && subTasks && subTasks.length > 0) {
      newGoal.subTasks = subTasks.map(task => ({
        title: task.title,
        description: task.description,
        assignedTo: task.assignedTo,
        status: 'Not Started',
        completionPercentage: 0
      }));
    }

    // Add category-specific fields
    if (goalCategory === 'Fitness' && fitnessType) {
      newGoal.fitnessType = fitnessType;
      if (duration) newGoal.duration = Number(duration);
      if (distance) newGoal.distance = Number(distance);
      if (sets) newGoal.sets = Number(sets);
      if (reps) newGoal.reps = Number(reps);
      if (weight) newGoal.weight = Number(weight);
    } else if (goalCategory === 'Education' && educationType) {
      newGoal.educationType = educationType;
      if (studyHours) newGoal.studyHours = Number(studyHours);
      if (pages) newGoal.pages = Number(pages);
      if (modules) newGoal.modules = Number(modules);
      if (testScore) newGoal.testScore = testScore;
    }

    await newGoal.save();
    const responseGoal = newGoal.toObject();
    responseGoal.id = responseGoal._id;
    res.status(201).json(responseGoal);
  } catch (error) {
    console.error('Goal creation error:', error.message);
    // More detailed error response
    if (error.name === 'ValidationError') {
      // Handle mongoose validation errors
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ errors });
    }
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

export const getUserGoals = async (req, res) => {
  try {
    // Get goals created by the user
    const userCreatedGoals = await Goal.find({ createdBy: req.userId })
      .populate('participants', 'name profilePicture')
      .populate('individualProgress.userId', 'name profilePicture')
      .populate('subTasks.assignedTo', 'name profilePicture');
    
    // For collaborative goals, only get goals where:
    // 1. The user is listed as a participant AND
    // 2. The user has accepted the goal share request
    
    // First, get all goal shares accepted by this user
    const acceptedShares = await GoalShare.find({
      friendUserId: req.userId,
      status: 'Accepted'
    }).distinct('goalId');
    
    // Then get participating goals where the user has accepted the share
    const participatingGoals = await Goal.find({
      _id: { $in: acceptedShares },
      participants: req.userId,
      createdBy: { $ne: req.userId } // Exclude goals created by the user to avoid duplicates
    })
      .populate('participants', 'name profilePicture')
      .populate('individualProgress.userId', 'name profilePicture')
      .populate('subTasks.assignedTo', 'name profilePicture');
    
    // Combine both sets of goals
    const allGoals = [...userCreatedGoals, ...participatingGoals];
    
    // Transform goals to include id field for frontend
    const transformedGoals = allGoals.map(goal => {
      const goalObj = goal.toObject();
      goalObj.id = goalObj._id;
      return goalObj;
    });
    
    res.status(200).json(transformedGoals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
};

export const getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id)
      .populate('participants', 'name profilePicture')
      .populate('individualProgress.userId', 'name profilePicture')
      .populate('subTasks.assignedTo', 'name profilePicture');
      
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    // Get list of participants as strings for easier comparison
    const participantIds = goal.participants.map(p => 
      p._id ? p._id.toString() : p.toString()
    );
    
    console.log("Goal participants:", participantIds);
    console.log("Current user:", req.userId);
    console.log("Creator:", goal.createdBy.toString());
    
    // Check if the user has permission to view this goal
    // User is allowed if they are the creator OR a participant
    if (goal.createdBy.toString() !== req.userId && 
        !participantIds.includes(req.userId)) {
      return res.status(403).json({ msg: 'Not authorized to view this goal' });
    }
    
    res.status(200).json(goal);
  } catch (error) {
    console.error('Error in getGoalById:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};


export const updateGoal = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      goalType, 
      goalCategory,
      frequency, 
      startDate, 
      endDate, 
      progressFrequency, 
      priority, 
      status,
      // Fitness specific fields
      fitnessType,
      duration,
      distance,
      sets,
      reps,
      weight,
      // Education specific fields
      educationType,
      studyHours,
      pages,
      modules,
      testScore,
      // Sub-tasks updates
      subTasks
    } = req.body;

    // First find the goal to check permissions
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    // Check if user is the creator of the goal
    if (goal.createdBy.toString() !== req.userId) {
      return res.status(403).json({ msg: 'Not authorized to update this goal' });
    }
    
    // Prepare update object
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (goalType) updateData.goalType = goalType;
    if (goalCategory) updateData.goalCategory = goalCategory;
    if (frequency) updateData.frequency = frequency;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (progressFrequency) updateData.progressFrequency = progressFrequency;
    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;
    
    // Update sub-tasks if provided
    if (subTasks !== undefined) {
      updateData.subTasks = subTasks;
    }
    
    // Add category-specific fields
    if (goalCategory === 'Fitness') {
      if (fitnessType) updateData.fitnessType = fitnessType;
      if (duration) updateData.duration = Number(duration);
      if (distance) updateData.distance = Number(distance);
      if (sets) updateData.sets = Number(sets);
      if (reps) updateData.reps = Number(reps);
      if (weight) updateData.weight = Number(weight);
    } else if (goalCategory === 'Education') {
      if (educationType) updateData.educationType = educationType;
      if (studyHours) updateData.studyHours = Number(studyHours);
      if (pages) updateData.pages = Number(pages);
      if (modules) updateData.modules = Number(modules);
      if (testScore) updateData.testScore = testScore;
    }

    const updatedGoal = await Goal.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    
    res.status(200).json(updatedGoal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
};

export const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    // Check if user is the creator of the goal
    if (goal.createdBy.toString() !== req.userId) {
      return res.status(403).json({ msg: 'Not authorized to delete this goal' });
    }
    
    await Goal.findByIdAndDelete(req.params.id);
    res.status(200).json({ msg: 'Goal deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// New endpoints for collaborative goals

export const shareGoal = async (req, res) => {
  const { goalId, friendIds, message, collaborativeType, subTasks } = req.body;
  
  try {
    console.log("Share goal request received:", req.body);
    
    // Validate goal exists
    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    // Verify user is the creator
    if (goal.createdBy.toString() !== req.userId) {
      return res.status(403).json({ msg: 'Not authorized to share this goal' });
    }
    
    // Update goal type to Group if it's not already
    if (goal.goalType !== 'Group') {
      goal.goalType = 'Group';
      goal.collaborativeType = collaborativeType;
      
      // Add sub-tasks if this is an achieve-together type
      if (collaborativeType === 'achieve-together' && subTasks && subTasks.length > 0) {
        goal.subTasks = subTasks;
      }
      
      await goal.save();
    }
    
    // Process share results
    const shareResults = [];
    
    // Create GoalShare records for each friend
    for (const friendId of friendIds) {
      try {
        // Verify friend exists
        const friend = await User.findById(friendId);
        if (!friend) {
          shareResults.push({
            friendId,
            status: 'failed',
            reason: 'User not found'
          });
          continue;
        }
        
        // Check if already shared
        const existingShare = await GoalShare.findOne({ 
          goalId: goalId,
          userId: req.userId,
          friendUserId: friendId
        });
        
        if (existingShare) {
          shareResults.push({
            friendId,
            status: 'skipped',
            reason: 'Already shared with this friend'
          });
          continue;
        }
        
        // Create new GoalShare record
        const goalShare = new GoalShare({
          goalId: goalId,
          userId: req.userId,
          friendUserId: friendId,
          status: 'Pending',
          message: message || ''
        });
        
        await goalShare.save();
        
        // Add friend to goal participants if not already there
        if (!goal.participants.includes(friendId)) {
          goal.participants.push(friendId);
          
          // For compete type, initialize individual progress
          if (goal.collaborativeType === 'compete') {
            goal.individualProgress.push({
              userId: friendId,
              completionPercentage: 0,
              totalProgress: 0,
              lastUpdated: new Date()
            });
          }
        }
        
        shareResults.push({
          friendId,
          status: 'success'
        });
      } catch (error) {
        console.error('Error sharing with friend:', friendId, error);
        shareResults.push({
          friendId,
          status: 'failed',
          reason: 'Server error'
        });
      }
    }
    
    await goal.save();
    console.log("Share results:", shareResults);
    
    res.status(200).json({
      msg: 'Goal shared successfully',
      goalId: goal._id,
      shareResults
    });
  } catch (error) {
    console.error('Error in shareGoal:', error);
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

export const getSharedGoals = async (req, res) => {
  try {
    const sharedGoals = await Goal.find({
      participants: req.userId
    })
      .populate('participants', 'name profilePicture')
      .populate('individualProgress.userId', 'name profilePicture')
      .populate('subTasks.assignedTo', 'name profilePicture');
    
    res.status(200).json(sharedGoals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
};

export const leaveSharedGoal = async (req, res) => {
  try {
    const goalId = req.params.id;
    
    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    // Check if user is a participant
    if (!goal.participants.includes(req.userId)) {
      return res.status(400).json({ msg: 'You are not a participant in this goal' });
    }
    
    // Remove user from participants
    goal.participants = goal.participants.filter(
      participantId => participantId.toString() !== req.userId
    );
    
    // If it's a compete type goal, remove individual progress
    if (goal.collaborativeType === 'compete') {
      goal.individualProgress = goal.individualProgress.filter(
        progress => progress.userId.toString() !== req.userId
      );
    }
    
    await goal.save();
    
    res.status(200).json({ msg: 'Successfully left the shared goal' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
};

export const updateGoalProgress = async (req, res) => {
  const { value, notes, subTaskId, isUnitValue } = req.body;
  
  try {
    console.log("Updating progress for goal:", req.params.id, "Value:", value, "Notes:", notes, "SubTaskId:", subTaskId, "IsUnitValue:", isUnitValue);
    const goal = await Goal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    // Check if user is allowed to update progress
    if (goal.createdBy.toString() !== req.userId && 
        !goal.participants.includes(req.userId)) {
      return res.status(403).json({ msg: 'Not authorized to update this goal' });
    }
    
    // For achieve-together goals with sub-tasks, check assignment
    if (goal.collaborativeType === 'achieve-together' && subTaskId) {
      const subTaskIndex = goal.subTasks.findIndex(st => st._id.toString() === subTaskId);
      if (subTaskIndex === -1) {
        return res.status(404).json({ msg: 'Sub-task not found' });
      }
      
      const subTask = goal.subTasks[subTaskIndex];
      
      // Check if user is assigned to this sub-task
      if (subTask.assignedTo.toString() !== req.userId) {
        return res.status(403).json({ msg: 'You are not assigned to this sub-task' });
      }
      
      // Update sub-task progress based on range
      if (subTask.startValue !== undefined && subTask.endValue !== undefined) {
        const rangeTotal = subTask.endValue - subTask.startValue;
        
        // If isUnitValue flag is true, the value is in original units (pages, km, etc.)
        if (isUnitValue) {
          // Calculate what percentage of the range this value represents
          // For example, if range is 50-100, and value is 75, that's 50% complete
          const progressInRange = Math.min(Math.max(value - subTask.startValue, 0), rangeTotal);
          subTask.completionPercentage = Math.min(100, (progressInRange / rangeTotal) * 100);
        } 
        // If value is a percentage (0-100)
        else if (value >= 0 && value <= 100) {
          subTask.completionPercentage = value;
        } 
        // If value is an absolute value but flag not set (legacy compatibility)
        else {
          // Make a reasonable guess if it's an absolute value
          if (value > 100 && value <= subTask.endValue) {
            const progressInRange = Math.min(Math.max(value - subTask.startValue, 0), rangeTotal);
            subTask.completionPercentage = Math.min(100, (progressInRange / rangeTotal) * 100);
          } else {
            // Treat as percentage but cap at 100
            subTask.completionPercentage = Math.min(100, value);
          }
        }
        
        // Update sub-task status based on completion
        if (subTask.completionPercentage >= 100) {
          subTask.status = 'Completed';
        } else if (subTask.completionPercentage > 0) {
          subTask.status = 'In Progress';
        }
      } else {
        // Legacy sub-tasks without range values
        subTask.completionPercentage = Math.min(100, value);
        
        if (subTask.completionPercentage >= 100) {
          subTask.status = 'Completed';
        } else if (subTask.completionPercentage > 0) {
          subTask.status = 'In Progress';
        }
      }
      
      // Recalculate overall goal completion as weighted average of sub-tasks
      let totalWeightedCompletion = 0;
      let totalWeight = 0;
      
      goal.subTasks.forEach(task => {
        // Calculate weight based on range size
        let weight = 1; // Default weight
        if (task.startValue !== undefined && task.endValue !== undefined) {
          weight = task.endValue - task.startValue;
        }
        
        totalWeightedCompletion += (task.completionPercentage * weight);
        totalWeight += weight;
      });
      
      if (totalWeight > 0) {
        goal.completionPercentage = totalWeightedCompletion / totalWeight;
      }
    } else {
      // Use the model's original updateProgress method for other goal types
      await goal.updateProgress(Number(value), notes, req.userId, subTaskId);
      
      // Return early since updateProgress already saves the goal
      // Re-fetch and populate the goal
      const updatedGoal = await Goal.findById(req.params.id)
        .populate('participants', 'name profilePicture')
        .populate('individualProgress.userId', 'name profilePicture')
        .populate('subTasks.assignedTo', 'name profilePicture');
      
      // Transform goal to include id field for frontend
      const goalObj = updatedGoal.toObject();
      goalObj.id = goalObj._id;
      
      return res.status(200).json(goalObj);
    }
    
    // Add to progress history
    goal.progressHistory.push({
      date: new Date(),
      value: Number(value),
      notes: notes || '',
      updatedBy: req.userId,
      subTaskId: subTaskId
    });
    
    // Update goal status based on completion
    if (goal.completionPercentage >= 100) {
      goal.status = 'Completed';
    } else if (goal.completionPercentage > 0) {
      goal.status = 'In Progress';
    }
    
    await goal.save();
    
    // Re-fetch and populate the goal
    const updatedGoal = await Goal.findById(req.params.id)
      .populate('participants', 'name profilePicture')
      .populate('individualProgress.userId', 'name profilePicture')
      .populate('subTasks.assignedTo', 'name profilePicture');
    
    // Transform goal to include id field for frontend
    const goalObj = updatedGoal.toObject();
    goalObj.id = goalObj._id;
    
    res.status(200).json(goalObj);
  } catch (error) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// New endpoint to update a specific sub-task status
export const updateSubTaskStatus = async (req, res) => {
  const { goalId, subTaskId, status } = req.body;
  
  try {
    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }
    
    // Find the sub-task
    const subTask = goal.subTasks.find(st => st._id.toString() === subTaskId);
    if (!subTask) {
      return res.status(404).json({ msg: 'Sub-task not found' });
    }
    
    // Check if user is assigned to this sub-task or is the goal creator
    if (subTask.assignedTo.toString() !== req.userId && 
        goal.createdBy.toString() !== req.userId) {
      return res.status(403).json({ msg: 'Not authorized to update this sub-task' });
    }
    
    // Update sub-task status
    subTask.status = status;
    if (status === 'Completed') {
      subTask.completionPercentage = 100;
    }
    
    // Recalculate overall goal completion
    const totalSubTaskCompletion = goal.subTasks.reduce(
      (sum, st) => sum + st.completionPercentage, 0
    );
    goal.completionPercentage = totalSubTaskCompletion / goal.subTasks.length;
    
    if (goal.completionPercentage >= 100) {
      goal.status = 'Completed';
    } else if (goal.completionPercentage > 0) {
      goal.status = 'In Progress';
    }
    
    await goal.save();
    
    res.status(200).json(goal);
  } catch (error) {
    console.error('Error updating sub-task status:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};