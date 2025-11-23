// Ruta: Joyeria-Diana-Laura/Backend/src/routes/authRoutes.ts
import express from 'express';
import { 
    login, 
    forgotPassword, 
    resetPassword,
    checkUserExists,
    checkEmailCredits,
    checkEmailConfig,
    validateEmail,
    syncUserToPostgreSQL,
    checkFirebaseUser,
    testEmailDelivery,
    checkAccountLock,
    unlockAccount,
    resetRecoveryAttempts,
    updateUserActivity,
    checkLoginSecurity    
} from '../controllers/authController';

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/check-user', checkUserExists); 
router.get('/email-credits', checkEmailCredits);
router.get('/check-email-config', checkEmailConfig);
router.post('/validate-email', validateEmail);
router.post('/sync-user', syncUserToPostgreSQL);
router.post('/check-firebase-user', checkFirebaseUser);
router.post('/test-email', testEmailDelivery);

// 🎯 NUEVAS RUTAS DE SEGURIDAD
router.post('/check-account-lock', checkAccountLock);
router.post('/unlock-account', unlockAccount);
router.post('/reset-recovery-attempts', resetRecoveryAttempts);
router.post('/update-activity', updateUserActivity); 
router.post('/check-login-security', checkLoginSecurity);
router.post('/check-account-lock', checkAccountLock);

export default router;