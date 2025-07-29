import { quotes } from '../models/motivationModel.js'; // Importing predefined motivational quotes
import User from '../models/User.js';  // Assuming you have a User model to store users and their favorite quotes

// Get Motivation Quotes
export const getMotivationQuotes = async (req, res) => {
    try {
        // Returning a random quote from the list
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        res.status(200).json({ quote: randomQuote });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotes', error });
    }
};

// Save Favorite Quote
export const saveFavoriteQuote = async (req, res) => {
    const { quote } = req.body; // The quote to save as a favorite
    const userId = req.user.id; // Assuming user ID is in the token (from middleware)

    try {
        // Fetch the user from the database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the quote is already in the user's favorites
        if (!user.favoriteQuotes.includes(quote)) {
            user.favoriteQuotes.push(quote);  // Add quote to the favorites array
            await user.save();  // Save the user with the updated favorites
        }

        res.status(200).json({ message: "Quote saved to favorites" });
    } catch (err) {
        res.status(500).json({ message: "Error saving quote", error: err });
    }
};

// Fetch User's Favorite Quotes
export const getFavoriteQuotes = async (req, res) => {
    const userId = req.user.id;  // Assuming user ID is in the token (from middleware)

    try {
        // Fetch the user from the database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the user's favorite quotes
        res.status(200).json({ favoriteQuotes: user.favoriteQuotes });
    } catch (err) {
        res.status(500).json({ message: "Error fetching favorite quotes", error: err });
    }
};
