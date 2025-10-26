import express from 'express';
import { 
    register, 
    login, 
    forgotPassword, 
    resetPassword,
    verifyResetToken 
} from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

export default router;