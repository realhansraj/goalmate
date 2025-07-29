// socketHandler.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from './models/messageModel.js';
import Conversation from './models/conversationModel.js';

const setupSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // In production, set specific origins
      methods: ["GET", "POST"]
    }
  });

  // User to socket mapping
  const userSockets = new Map();

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Use 'id' from payload if 'userId' is not present
      socket.userId = decoded.userId || decoded.id;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${userId}`);
    
    userSockets.set(userId, socket.id);

    socket.on('join conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    socket.on('send message', async (data) => {
      try {
        const { conversationId, content } = data;

        const message = new Message({
          conversationId,
          sender: userId,
          content,
          readBy: [userId]
        });
        await message.save();

        await message.populate('sender', 'name email profilePicture');

        const conversation = await Conversation.findById(conversationId);
        conversation.lastMessage = message._id;
        conversation.updatedAt = Date.now();

        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== userId.toString()) {
            const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
            conversation.unreadCount.set(participantId.toString(), currentCount + 1);
          }
        });

        await conversation.save();

        io.to(conversationId).emit('new message', {
          message: {
            _id: message._id,
            conversationId,
            sender: message.sender,
            content,
            createdAt: message.createdAt,
            readBy: message.readBy
          }
        });

        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== userId.toString()) {
            const socketId = userSockets.get(participantId.toString());
            if (socketId) {
              io.to(socketId).emit('conversation update', {
                conversationId,
                lastMessage: {
                  _id: message._id,
                  content,
                  sender: message.sender._id,
                  createdAt: message.createdAt,
                },
                unreadCount: conversation.unreadCount.get(participantId.toString()) || 0
              });
              // Emit a notification event for push notification
              io.to(socketId).emit('notification', {
                type: 'message',
                conversationId,
                content,
                sender: message.sender._id,
                createdAt: message.createdAt
              });
            }
          }
        });
      } catch (error) {
        console.error('Error handling socket message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('mark as read', async ({ conversationId }) => {
      try {
        await Message.updateMany(
          { 
            conversationId, 
            sender: { $ne: userId },
            readBy: { $ne: userId }
          },
          { $addToSet: { readBy: userId } }
        );

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.unreadCount.set(userId.toString(), 0);
          await conversation.save();

          socket.to(conversationId).emit('messages read', {
            conversationId,
            userId
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user typing', {
        conversationId,
        userId
      });
    });

    socket.on('stop typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user stop typing', {
        conversationId,
        userId
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      userSockets.delete(userId);
    });
  });

  return io;
};

export default setupSocketServer;
