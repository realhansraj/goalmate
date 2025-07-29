import express from 'express';
import { addProgress } from '../controller/progressController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add', authMiddleware, addProgress);
// router.post('/add',()=>{
//     console.log("dsjfg")
// });
export default router;
