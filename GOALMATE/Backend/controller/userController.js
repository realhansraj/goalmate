// userController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import PremiumRequest from '../models/premiumRequestModel.js';
import sendEmail from '../utils/sendEmail.js';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register User
export const registerUser = async (req, res) => {
  try {
    const { name, age, email, password, gender } = req.body;
    
    console.log("Register request body:", req.body);
    console.log("Register request files:", req.files);
    
    let profilePicture = '';
    if (req.files && req.files.file && req.files.file.length > 0) {
      profilePicture = req.files.file[0].filename;
    }
    
    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create new user
    const newUser = new User({
      name,
      age,
      email,
      profilePicture,
      password: hashedPassword,
      gender,
      isVerified: false,
      emailVerificationToken,
      emailVerificationTokenExpires
    });
    await newUser.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${emailVerificationToken}`;
    await sendEmail({
      to: newUser.email,
      subject: 'Verify your email',
      text: `Click the following link to verify your email: ${verificationUrl}`,
      html: `<p>Click the following link to verify your email:</p><a href="${verificationUrl}">${verificationUrl}</a>`
    });

    res.status(201).json({ message: 'User registered successfully! Please check your email to verify your account.' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Login User with account status check
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Find user by email
    const user = await User.findOne({ email });
    console.log('Login attempt for email:', email);
    console.log('User found:', user);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // REMOVED EMAIL VERIFICATION CHECK - Users can login immediately
    
    // Check password
    let isMatch;
    if (user.email === 'admin@goalmate.com') {
      // TEMP: Plain text comparison for admin
      isMatch = (password === user.password);
      console.log('TEMP: Admin plain text password match:', isMatch);
    } else {
      isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match result:', isMatch);
    }
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    // CHECK ACCOUNT STATUS - This is the critical addition
    if (user.accountStatus === 'Suspended') {
      return res.status(403).json({ 
        message: 'Your account has been temporarily suspended. Please contact support for assistance.'
      });
    }
    
    if (user.accountStatus === 'Banned') {
      return res.status(403).json({ 
        message: 'Your account has been banned. Please contact support for assistance.'
      });
    }
    
    // Generate JWT with userId for socket usage
    const token = jwt.sign(
      { id: user._id, userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        gender: user.gender,
        isAdmin: user.isAdmin,
        isPremium: user.isPremium,
        _id: user._id,
        accountStatus: user.accountStatus
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Forgot Password (send OTP)
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email' });
    }
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Your Password Reset OTP',
      text: `Your OTP is: ${otp}`,
      html: `<p>Your OTP is: <b>${otp}</b></p>`
    });
    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error sending OTP', error: error.message });
  }
};

// OTP-based password reset
export const resetPasswordWithOTP = async (req, res) => {
  const { email, otp, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (
      !user.resetPasswordOTP ||
      user.resetPasswordOTP !== otp ||
      !user.resetPasswordOTPExpires ||
      user.resetPasswordOTPExpires < Date.now()
    ) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

// Verify Email
export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error verifying email', error: error.message });
  }
};

// Upgrade user to premium (admin only)
export const upgradeToPremium = async (req, res) => {
  try {
    // Check if requester is admin
    const adminUser = await User.findById(req.userId);
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ message: 'Only admins can upgrade users to premium.' });
    }
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.isPremium = true;
    await user.save();
    res.status(200).json({ message: 'User upgraded to premium successfully', user: { id: user._id, isPremium: user.isPremium } });
  } catch (error) {
    console.error('Error upgrading user to premium:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// User requests premium
export const requestPremium = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.userId;
    // Check if a pending request already exists
    const existing = await PremiumRequest.findOne({ userId, status: 'pending' });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending premium request.' });
    }
    const request = new PremiumRequest({ userId, plan });
    await request.save();
    res.status(201).json({ message: 'Premium request submitted. Await admin approval.' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting premium request', error: error.message });
  }
};