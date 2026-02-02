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
    revokeAllSessions ,
    validateSession, 
    logout,
    diagnosticCheckUsersTable
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware'; 
import { mfaController } from '../controllers/mfaController';

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

// 🎯 RUTAS DE SEGURIDAD
router.post('/check-account-lock', checkAccountLock);
router.post('/unlock-account', unlockAccount);
router.post('/reset-recovery-attempts', resetRecoveryAttempts);
router.post('/update-activity', updateUserActivity); 
router.post('/check-login-security', checkLoginSecurity);

// 🆕 RUTAS PROTEGIDAS PARA GESTIÓN DE SESIONES (con autenticación)
router.post('/sessions/active', authenticateToken, getActiveSessions);
router.post('/sessions/revoke', authenticateToken, revokeSession);
router.post('/sessions/revoke-others', authenticateToken, revokeAllOtherSessions);
router.post('/sessions/revoke-all', authenticateToken, revokeAllSessions);

// 🆕 RUTAS PROTEGIDAS (con autenticación)
router.get('/validate-session', authenticateToken, validateSession);
router.post('/logout', authenticateToken, logout);

// 🆕 RUTAS MFA (agregar al final)
router.post('/mfa/setup', authenticateToken, mfaController.setupMFA);
router.post('/mfa/verify-enable', authenticateToken, mfaController.verifyAndEnableMFA);
router.post('/mfa/verify-login', mfaController.verifyLoginMFA); // 🚫 SIN autenticación (para login)
router.post('/mfa/disable', authenticateToken, mfaController.disableMFA);
router.post('/mfa/status', authenticateToken, mfaController.checkMFAStatus);

// 🆕 RUTA DE DIAGNÓSTICO (temporal para debugging)
router.get('/diagnostic/users-table', diagnosticCheckUsersTable);

export default router;