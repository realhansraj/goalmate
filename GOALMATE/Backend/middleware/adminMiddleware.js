// adminMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const adminMiddleware = async (req, res, next) => {
    try {
        // First apply the auth middleware to verify the token
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ message: 'Access Denied' });
        
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        if (!token) return res.status(401).json({ message: 'Access Denied' });
        
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = verified.id;
        
        // Check if the user is an admin
        const user = await User.findById(req.userId);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        next();
    } catch (err) {
        res.status(400).json({ message: 'Invalid Token or Admin Access Denied' });
    }
};

export default adminMiddleware;