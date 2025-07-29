// scripts/createAdminUser.js
/**
 * Script to create the initial admin user or grant admin privileges to an existing user
 * 
 * Run with: node createAdminUser.js [email] [mongodb-uri]
 * 
 * This script connects directly to the MongoDB database to update user records,
 * bypassing normal API authentication requirements.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up proper paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Define User schema to match the application's User model
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    profilePicture: { type: String, default: '' },
    password: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'], required: true },
    isAdmin: { type: Boolean, default: false },
    accountStatus: { type: String, enum: ['Active', 'Suspended', 'Banned'], default: 'Active' },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// Main function to create or update admin user
async function setupAdminUser() {
  try {
    const userEmail = process.argv[2];
    
    if (!userEmail) {
      console.error('Error: Please provide the email of the user to make admin.');
      console.log('Usage: node createAdminUser.js [email] [mongodb-uri]');
      process.exit(1);
    }
    
    // Check if MongoDB URI is provided as an argument or in .env
    const mongoURI = process.argv[3] || process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.error('Error: MongoDB URI not found. Please provide it as an argument or set it in the .env file.');
      console.log('Usage: node createAdminUser.js [email] [mongodb-uri]');
      console.log('Example: node createAdminUser.js admin@example.com mongodb://localhost:27017/goalmate');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: userEmail });
    
    if (existingUser) {
      // Update existing user to admin
      existingUser.isAdmin = true;
      await existingUser.save();
      
      console.log(`\nSuccess! User ${existingUser.name} (${existingUser.email}) has been granted admin privileges.`);
    } else {
      // Create new admin user
      console.log(`\nUser with email ${userEmail} not found. Creating a new admin user...`);
      
      // Generate random password or use provided password
      const password = process.argv[4] || Math.random().toString(36).substring(2, 10);
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = new User({
        name: 'Admin User',
        age: 30,
        email: userEmail,
        password: hashedPassword,
        gender: 'Other',
        isAdmin: true
      });
      
      await newUser.save();
      
      console.log(`\nSuccess! New admin user created with the following credentials:`);
      console.log(`- Email: ${userEmail}`);
      console.log(`- Password: ${password}`);
      console.log('\nPlease login with these credentials and change your password immediately.');
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
setupAdminUser();