// authMiddleware.js
import jwt from 'jsonwebtoken';
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Access Denied' });
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
if (!token) return res.status(401).json({ message: 'Access Denied' });
try {
const verified = jwt.verify(token, process.env.JWT_SECRET);
req.userId = verified.id;
next();
 } catch (err) {
res.status(400).json({ message: 'Invalid Token' });
 }
};
export default authMiddleware; // Change to ES6 export