// User.js (User Model)
import mongoose from 'mongoose';
const userSchema = new mongoose.Schema(
 {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    profilePicture: { type: String, default: '' }, // Path to the profile picture
    password: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    isAdmin: { type: Boolean, default: false }, // Added admin role field
    isPremium: { type: Boolean, default: false }, // Added premium status field
    accountStatus: { type: String, enum: ['Active', 'Suspended', 'Banned'], default: 'Active' }, // Added account status field
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordOTP: { type: String },
    resetPasswordOTPExpires: { type: Date },
    isVerified: { type: Boolean, default: false }, // Changed default to false - email verification needed
    emailVerificationToken: { type: String },
    emailVerificationTokenExpires: { type: Date },
 },
 { timestamps: true }
);
const User = mongoose.model('User', userSchema);
export default User;