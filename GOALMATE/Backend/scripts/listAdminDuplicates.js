import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://bscs2112214:NDOKDsO1L8gnPLSr@cluster0.v94z9.mongodb.net/goalmate?retryWrites=true&w=majority';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  _id: mongoose.Schema.Types.ObjectId
});
const User = mongoose.model('User', userSchema);

async function listAdminDuplicates() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const users = await User.find({ email: 'admin@goalmate.com' });
    if (users.length === 0) {
      console.log('No users found with email admin@goalmate.com');
    } else {
      console.log(`Found ${users.length} user(s) with email admin@goalmate.com:`);
      users.forEach(u => {
        console.log(`_id: ${u._id}, name: ${u.name}, password: ${u.password}`);
      });
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listAdminDuplicates(); 