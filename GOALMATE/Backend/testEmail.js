import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmail() {
  try {
    console.log('Testing email configuration...');
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email configuration missing!');
      console.log('Please set EMAIL_USER and EMAIL_PASS in your .env file');
      return;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Test email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'GoalMate - Email Test',
      text: 'This is a test email from your GoalMate application. If you receive this, your email configuration is working correctly!',
    };

    console.log('Sending test email...');
    await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log('Check your inbox for the test email.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Common issues:');
      console.log('1. Make sure 2-Factor Authentication is enabled');
      console.log('2. Use the App Password, not your regular Gmail password');
      console.log('3. Check that EMAIL_USER and EMAIL_PASS are correct in .env');
    }
  }
}

testEmail(); 