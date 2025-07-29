import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://bscs2112214:NDOKDsO1L8gnPLSr@cluster0.v94z9.mongodb.net/test?retryWrites=true&w=majority';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  _id: mongoose.Schema.Types.ObjectId
});
const User = mongoose.model('User', userSchema);

async function setAdminPlainPassword() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@goalmate.com';
    const plainPassword = 'admin123';

    const userBefore = await User.findOne({ email: adminEmail });
    console.log('User before update:', userBefore);

    const result = await User.updateOne(
      { email: adminEmail },
      { $set: { password: plainPassword } }
    );

    console.log(`Matched documents: ${result.matchedCount}`);
    console.log(`Modified documents: ${result.modifiedCount}`);

    const userAfter = await User.findOne({ email: adminEmail });
    console.log('User after update:', userAfter);

    if (result.matchedCount > 0) {
      console.log(`\n✅ Admin password set to plain text successfully!`);
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 New Plain Password: ${plainPassword}`);
    } else {
      console.log(`\n❌ Admin user with email ${adminEmail} not found.`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

setAdminPlainPassword(); 