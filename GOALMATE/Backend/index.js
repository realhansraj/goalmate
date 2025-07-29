// /Users/admin/Documents/GOALMATE/Backend/index.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import userRoutes from './Routes/userRoutes.js';
import goalRoutes from './Routes/goalRoutes.js';
import progressRoutes from './Routes/progressRoutes.js';
import friendshipRoutes from './Routes/friendshipRoutes.js'; // Import friendship routes
import goalShareRoutes from './Routes/goalShareRoutes.js';
import motivationRoutes from './Routes/motivationRoutes.js';
import chatRoutes from './Routes/chatRoutes.js';  // Import chat routes
import profileRoutes from './Routes/profileRoutes.js'; // Import profile routes
import setupSocketServer from './socketHandler.js';  // Import socket setup
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url'; // Add this import for profile picture
import goalDeleteRoutes from './Routes/goalDeleteRoutes.js';
import adminRoutes, { reportRoutes } from './Routes/adminRoutes.js'; // Import the admin routes
import settingsRoutes from './Routes/settingsRoutes.js';

dotenv.config();
const router = express.Router();

const app = express();
const port = process.env.PORT || 5000;
//app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS
app.use(express.json()); // To parse JSON requests
// Routes setup
app.use('/api/friendship', friendshipRoutes);
app.use('/api/friends', friendshipRoutes);  // Add friendship routes
app.use('/api/users', userRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api', motivationRoutes);
app.use('/api/chat', chatRoutes);  // Add chat routes
app.use('/api/goalShare', goalShareRoutes);
app.use('/api/goalDelete', goalDeleteRoutes);
app.use('/api/profile', profileRoutes); // Add profile routes
app.use('/api/admin', adminRoutes); // Admin routes (protected by admin middleware)
app.use('/api', reportRoutes); // Report submission route (for regular users)
app.use('/api/settings', settingsRoutes); // Add this new settings route

// MongoDB connection
mongoose
    .connect(process.env.MONGO_URI, {})
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.log('Error connecting to MongoDB:', err);
    });



// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static file serving for uploads
const uploadsFolder = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsFolder));

// Socket setup
const server = http.createServer(app);
const io = setupSocketServer(server);

// Start the server with socket integration
server.listen(port, () => {
    console.log(`Server is running on http://192.168.0.114:${port}`);
});

// Global error handler to ensure all errors return JSON
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});
