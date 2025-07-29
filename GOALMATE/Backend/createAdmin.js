import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB Atlas connection string
const MONGO_URI = 'mongodb+srv://bscs2112214:NDOKDsO1L8gnPLSr@cluster0.v94z9.mongodb.net/goalmate?retryWrites=true&w=majority';

// User schema
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

async function createAdminUser() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Using URI:', MONGO_URI);
    
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@goalmate.com' });
    
    if (existingAdmin) {
      console.log('\n📋 Admin user already exists:');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log('🔑 Password: admin123');
      console.log('✅ This user has admin privileges.');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = new User({
        name: 'Admin User',
        age: 30,
        email: 'admin@goalmate.com',
        password: hashedPassword,
        gender: 'Other',
        isAdmin: true
      });
      
      await adminUser.save();
      
      console.log('\n✅ New admin user created successfully!');
      console.log('📧 Email: admin@goalmate.com');
      console.log('🔑 Password: admin123');
      console.log('\n⚠️  Please change the password after first login!');
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB is not running locally. You need to:');
      console.log('1. Install MongoDB Community Server');
      console.log('2. Start MongoDB service');
      console.log('3. Or use a cloud MongoDB connection');
    }
  }
}

createAdminUser(); 