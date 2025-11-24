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
    checkLoginSecurity,
    getActiveSessions,
    revokeSession,
    revokeAllOtherSessions,
    revokeAllSessions    
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

// 🆕 NUEVAS RUTAS PARA GESTIÓN DE SESIONES
router.post('/sessions/active', getActiveSessions);
router.post('/sessions/revoke', revokeSession);
router.post('/sessions/revoke-others', revokeAllOtherSessions);
router.post('/sessions/revoke-all', revokeAllSessions);
export default router;