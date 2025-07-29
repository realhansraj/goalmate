// verifyAllUsers.js - Script to verify all existing users
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define User schema to match the application's User model
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    profilePicture: { type: String, default: '' },
    password: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    isAdmin: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    accountStatus: { type: String, enum: ['Active', 'Suspended', 'Banned'], default: 'Active' },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationTokenExpires: { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// Main function to verify all users
async function verifyAllUsers() {
  try {
    // Check if MongoDB URI is provided
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('Error: MongoDB URI not found. Please set it in the .env file.');
      console.log('Example: MONGO_URI=mongodb://localhost:27017/goalmate');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    
    // Find all users who are not verified
    const unverifiedUsers = await User.find({ isVerified: false });
    
    if (unverifiedUsers.length === 0) {
      console.log('No unverified users found. All users are already verified.');
    } else {
      console.log(`Found ${unverifiedUsers.length} unverified users. Updating them...`);
      
      // Update all unverified users to be verified
      const result = await User.updateMany(
        { isVerified: false },
        { 
          $set: { 
            isVerified: true,
            emailVerificationToken: undefined,
            emailVerificationTokenExpires: undefined
          }
        }
      );
      
      console.log(`\nSuccess! Updated ${result.modifiedCount} users to verified status.`);
      console.log('All users can now login without email verification.');
    }
    
    // Show total user count
    const totalUsers = await User.countDocuments();
    console.log(`\nTotal users in database: ${totalUsers}`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
verifyAllUsers(); 