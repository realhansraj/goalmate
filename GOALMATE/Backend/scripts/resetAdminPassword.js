import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB Atlas connection string (same as createAdmin.js)
const MONGO_URI = 'mongodb+srv://bscs2112214:NDOKDsO1L8gnPLSr@cluster0.v94z9.mongodb.net/goalmate?retryWrites=true&w=majority';

// User schema (minimal for password reset)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

async function resetAdminPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@goalmate.com';
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Print user before update
    const userBefore = await User.findOne({ email: adminEmail });
    console.log('\nUser before update:', userBefore);

    // Update password
    const result = await User.updateOne(
      { email: adminEmail },
      { $set: { password: hashedPassword } }
    );

    // Print update result
    console.log(`\nMatched documents: ${result.matchedCount}`);
    console.log(`Modified documents: ${result.modifiedCount}`);

    // Print user after update
    const userAfter = await User.findOne({ email: adminEmail });
    console.log('\nUser after update:', userAfter);

    if (result.matchedCount > 0) {
      console.log(`\n✅ Admin password reset successfully!`);
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 New Password: ${newPassword}`);
    } else {
      console.log(`\n❌ Admin user with email ${adminEmail} not found.`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetAdminPassword(); 