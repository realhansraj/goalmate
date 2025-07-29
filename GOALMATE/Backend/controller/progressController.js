import Progress from '../models/progressModel.js';

export const addProgress = async (req, res) => {
  const { goalId, progressType } = req.body;

  try {
    const newProgress = new Progress({
      goal: goalId,
      user: req.userId,
      progressType,
    });

    await newProgress.save();
    res.status(201).json(newProgress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
};
