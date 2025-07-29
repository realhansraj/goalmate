// goalReminderJob.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Goal from '../models/goalModel.js';
import User from '../models/User.js';
import { Server } from 'socket.io';
import http from 'http';
import setupSocketServer from '../socketHandler.js';
import Profile from '../models/profileModel.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app = http.createServer();
const io = setupSocketServer(app);

async function sendGoalReminders() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find goals ending in the next 24 hours and not completed
  const goals = await Goal.find({
    endDate: { $gte: now, $lte: in24h },
    status: { $ne: 'Completed' },
  });

  for (const goal of goals) {
    // Notify creator if reminders enabled
    const creatorProfile = await Profile.findOne({ userId: goal.createdBy });
    if (!creatorProfile || creatorProfile.notificationSettings?.remindersEnabled !== false) {
      io.to(goal.createdBy.toString()).emit('notification', {
        type: 'goal_reminder',
        goalId: goal._id,
        title: goal.title,
        endDate: goal.endDate,
        message: `Your goal "${goal.title}" is ending soon!`,
      });
    }
    // Notify participants if reminders enabled
    if (goal.participants && goal.participants.length > 0) {
      for (const userId of goal.participants) {
        const participantProfile = await Profile.findOne({ userId });
        if (!participantProfile || participantProfile.notificationSettings?.remindersEnabled !== false) {
          io.to(userId.toString()).emit('notification', {
            type: 'goal_reminder',
            goalId: goal._id,
            title: goal.title,
            endDate: goal.endDate,
            message: `The goal "${goal.title}" you are part of is ending soon!`,
          });
        }
      }
    }
  }
}

// Run the reminder job
sendGoalReminders().then(() => {
  console.log('Goal reminders sent.');
  process.exit(0);
}).catch((err) => {
  console.error('Error sending goal reminders:', err);
  process.exit(1);
}); 