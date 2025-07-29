import mongoose from 'mongoose';
import readline from 'readline';

const MONGO_URI = 'mongodb+srv://bscs2112214:NDOKDsO1L8gnPLSr@cluster0.v94z9.mongodb.net/test?retryWrites=true&w=majority';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  _id: mongoose.Schema.Types.ObjectId
});
const User = mongoose.model('User', userSchema);

const premiumRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: String,
  status: String,
  createdAt: Date
});
const PremiumRequest = mongoose.model('PremiumRequest', premiumRequestSchema);

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Enter user email: ', async (email) => {
    try {
      await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
      const user = await User.findOne({ email });
      if (!user) {
        console.log('User not found.');
        process.exit(0);
      }
      const requests = await PremiumRequest.find({ userId: user._id });
      if (requests.length === 0) {
        console.log('No premium requests found for this user.');
        process.exit(0);
      }
      console.log(`Found ${requests.length} premium request(s):`);
      requests.forEach(r => {
        console.log(`- ID: ${r._id}, Plan: ${r.plan}, Status: ${r.status}, Created: ${r.createdAt}`);
      });
      rl.question('Do you want to delete all these requests? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          await PremiumRequest.deleteMany({ userId: user._id });
          console.log('All premium requests deleted for this user.');
        } else {
          console.log('No requests deleted.');
        }
        await mongoose.disconnect();
        rl.close();
      });
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });
}

main(); 