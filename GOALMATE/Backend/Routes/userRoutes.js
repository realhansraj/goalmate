// userRoutes.js
import express from 'express';
import { registerUser, loginUser, forgotPassword, verifyEmail, upgradeToPremium, requestPremium, resetPasswordWithOTP } from '../controller/userController.js';
import { uploadFiles } from '../middleware/uploadMiddleware.js'
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();
//
// Routes
router.post('/register', uploadFiles, registerUser); // Uses multer middleware
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password-otp', resetPasswordWithOTP);
router.get('/verify-email', verifyEmail);
router.post('/upgrade-to-premium', authMiddleware, upgradeToPremium);
router.post('/request-premium', authMiddleware, requestPremium);
// router.post('/login', (req,res)=>{
// console.log(req.body)
// });
export default router;