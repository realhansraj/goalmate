import express from 'express';
import { getMotivationQuotes, saveFavoriteQuote, getFavoriteQuotes } from '../controller/motivationController.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

// Route to get motivation quotes
router.get('/motivation', getMotivationQuotes);

// Route to save a favorite quote (Protected Route)
router.post('/save', verifyToken, saveFavoriteQuote);

// Route to get all favorite quotes (Protected Route)
router.get('/favorites', verifyToken, getFavoriteQuotes);

export default router;
