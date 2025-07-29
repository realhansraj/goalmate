import Friendship from '../models/friendshipModel.js';
import User from '../models/User.js';

// Send Friend Request
export const sendFriendRequest = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.userId;

    if (userId === friendId) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    // Check if a request already exists in any state
    const existingFriendship = await Friendship.findOne({
      $or: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'Accepted') {
        return res.status(400).json({ message: "You are already friends with this user" });
      } else if (existingFriendship.status === 'Pending') {
        // If the receiver is the current user, accept the request
        if (existingFriendship.friendId.toString() === userId.toString()) {
          existingFriendship.status = 'Accepted';
          await existingFriendship.save();
          return res.status(200).json({ message: "Friend request accepted automatically since they had already sent you a request" });
        }
        return res.status(400).json({ message: "A friend request is already pending" });
      } else if (existingFriendship.status === 'Declined') {
        // Update declined request to pending
        existingFriendship.status = 'Pending';
        await existingFriendship.save();
        return res.status(200).json({ message: "Friend request sent successfully" });
      }
    }

    const friendship = new Friendship({ userId, friendId, status: 'Pending' });
    await friendship.save();

    return res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return res.status(500).json({ message: "Error sending friend request", error: error.message });
  }
};

// Accept Friend Request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.userId;

    const friendship = await Friendship.findOne({
      $or: [
        { userId: friendId, friendId: userId, status: 'Pending' }
      ]
    });

    if (!friendship) {
      return res.status(400).json({ message: "No pending friend request found from this user" });
    }

    friendship.status = 'Accepted';
    await friendship.save();

    return res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return res.status(500).json({ message: "Error accepting friend request", error: error.message });
  }
};

// Decline Friend Request
export const declineFriendRequest = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.userId;

    const friendship = await Friendship.findOne({
      $or: [
        { userId: friendId, friendId: userId, status: 'Pending' }
      ]
    });

    if (!friendship) {
      return res.status(400).json({ message: "No pending friend request found from this user" });
    }

    friendship.status = 'Declined';
    await friendship.save();

    return res.status(200).json({ message: "Friend request declined" });
  } catch (error) {
    console.error("Error declining friend request:", error);
    return res.status(500).json({ message: "Error declining friend request", error: error.message });
  }
};

// Get Friends List with more details
export const getFriendsList = async (req, res) => {
  try {
    const userId = req.userId;

    const friends = await Friendship.find({
      $or: [
        { userId, status: 'Accepted' },
        { friendId: userId, status: 'Accepted' }
      ]
    }).populate('userId friendId', 'name email profilePicture bio');

    const friendList = friends.map(friend => {
      const friendData = friend.userId._id.toString() === userId.toString() ? friend.friendId : friend.userId;
      return {
        _id: friendData._id,
        name: friendData.name,
        email: friendData.email,
        profilePicture: friendData.profilePicture,
        bio: friendData.bio,
        createdAt: friend.createdAt
      };
    });

    // Sort by name for better organization
    friendList.sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ friends: friendList });
  } catch (error) {
    console.error("Error retrieving friends list:", error);
    return res.status(500).json({ message: "Error retrieving friends list", error: error.message });
  }
};

// Get Friend Suggestions
export const getHiddenRequests = async (req, res) => {
  try {
    const userId = req.userId;

    // Find all users involved in any friendship with the current user
    const existingFriendships = await Friendship.find({
      $or: [
        { userId },
        { friendId: userId }
      ]
    }).select('friendId userId');

    // Collect both friendId and userId from the existing friendships
    const excludedUsers = existingFriendships.flatMap(friend => [
      friend.friendId.toString(),
      friend.userId.toString()
    ]);

    // Include the current user's ID to be excluded
    excludedUsers.push(userId.toString());

    // Remove duplicates
    const uniqueExcludedUsers = [...new Set(excludedUsers)];

    // Find potential friends not included in the excludedUsers list
    // Limit to 20 users for better performance and UI experience
    const suggestions = await User.find({ 
      _id: { $nin: uniqueExcludedUsers } 
    })
    .select('name email profilePicture bio')
    .sort({ createdAt: -1 })
    .limit(20);

    return res.status(200).json({ users: suggestions });
  } catch (error) {
    console.error("Error retrieving suggestions:", error);
    return res.status(500).json({ message: "Error retrieving friend suggestions", error: error.message });
  }
};

// Get Pending Friend Requests for Logged-in User
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.userId;

    // Find pending friend requests where the current user is the receiver
    const pendingFriendships = await Friendship.find({
      friendId: userId, 
      status: 'Pending'
    }).populate('userId', 'name email profilePicture bio');

    const pendingRequestList = pendingFriendships.map(request => ({
      _id: request.userId._id,
      name: request.userId.name,
      email: request.userId.email,
      profilePicture: request.userId.profilePicture,
      bio: request.userId.bio,
      createdAt: request.createdAt
    }));

    return res.status(200).json({ pendingRequests: pendingRequestList });
  } catch (error) {
    console.error("Error retrieving pending requests:", error);
    return res.status(500).json({ message: "Error retrieving pending friend requests", error: error.message });
  }
};

// Get Sent Friend Requests
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.userId;

    // Find pending friend requests where the current user is the sender
    const sentFriendships = await Friendship.find({
      userId, 
      status: 'Pending'
    }).populate('friendId', 'name email profilePicture bio');

    const sentRequestList = sentFriendships.map(request => ({
      _id: request.friendId._id,
      name: request.friendId.name,
      email: request.friendId.email,
      profilePicture: request.friendId.profilePicture,
      bio: request.friendId.bio,
      createdAt: request.createdAt
    }));

    return res.status(200).json({ sentRequests: sentRequestList });
  } catch (error) {
    console.error("Error retrieving sent requests:", error);
    return res.status(500).json({ message: "Error retrieving sent friend requests", error: error.message });
  }
};

// Remove a friend
export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.userId;

    const friendship = await Friendship.findOne({
      $or: [
        { userId, friendId, status: 'Accepted' },
        { userId: friendId, friendId: userId, status: 'Accepted' }
      ]
    });

    if (!friendship) {
      return res.status(400).json({ message: "You are not friends with this user" });
    }

    await Friendship.deleteOne({ _id: friendship._id });

    return res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Error removing friend:", error);
    return res.status(500).json({ message: "Error removing friend", error: error.message });
  }
};