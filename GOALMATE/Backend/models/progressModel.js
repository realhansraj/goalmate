import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  goal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  progressType: { type: String, required: true },  // e.g., '1 liter', '2 reps'
  progressDate: { type: Date, default: Date.now },
});

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;
