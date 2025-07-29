import mongoose from 'mongoose';

const friendshipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  friendId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Declined'],
    default: 'Pending',
    required: true,
  },
}, { timestamps: true });

const Friendship = mongoose.model('Friendship', friendshipSchema);

export default Friendship;
