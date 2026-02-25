// Ruta: Joyeria-Diana-Laura/Backend/src/routes/authRoutes.ts
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware'; 

// 📂 1. IMPORTACIONES DE AUTH (Carpeta: controllers/auth)
import { 
    login, 
    logout,
    syncUserToPostgreSQL,
    updateUserActivity,
    getActiveSessions,
    revokeSession,
    revokeAllOtherSessions,
    revokeAllSessions,
    validateSession
} from '../controllers/auth/authController';

// 📂 2. IMPORTACIONES DE RECUPERACIÓN (Carpeta: controllers/recuperacion)
import { 
    forgotPassword, 
    resetPassword,
    resetRecoveryAttempts,
    resetPasswordFirebase // Si la usas
} from '../controllers/recuperacion/recuperacionController';

// 📂 3. IMPORTACIONES DE SEGURIDAD (Carpeta: controllers/seguridad)
import { 
    checkAccountLock,
    unlockAccount,
    checkLoginSecurity,
    checkFirebaseUser,
    diagnosticCheckUsersTable
} from '../controllers/seguridad/seguridadController';

// 📂 4. IMPORTACIONES DE VALIDACIÓN EMAIL (Carpeta: controllers/validacion)
import { 
    validateEmail,
    checkEmailCredits,
    checkEmailConfig,
    testEmailDelivery
} from '../controllers/validacion/validacionEmailController';

// 📂 5. IMPORTACIONES DE USUARIO (Carpeta: controllers/usuario)
import { 
    checkUserExists 
} from '../controllers/usuario/usuarioController';

// 📂 6. IMPORTACIÓN MFA (Carpeta: controllers/seguridad)
import { mfaController } from '../controllers/seguridad/mfaController';


const router = express.Router();

// ==========================================
// 🔐 RUTAS DE AUTENTICACIÓN
// ==========================================
router.post('/login', login);
router.post('/sync-user', syncUserToPostgreSQL);
router.post('/update-activity', updateUserActivity);

// ==========================================
// 🔄 RUTAS DE RECUPERACIÓN
// ==========================================
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/reset-recovery-attempts', resetRecoveryAttempts);

// ==========================================
// 👤 RUTAS DE USUARIO
// ==========================================
router.post('/check-user', checkUserExists); 

// ==========================================
// 📧 RUTAS DE EMAIL Y CONFIGURACIÓN
// ==========================================
router.get('/email-credits', checkEmailCredits);
router.get('/check-email-config', checkEmailConfig);
router.post('/validate-email', validateEmail);
router.post('/check-firebase-user', checkFirebaseUser);
router.post('/test-email', testEmailDelivery);

// ==========================================
// 🛡️ RUTAS DE SEGURIDAD
// ==========================================
router.post('/check-account-lock', checkAccountLock);
router.post('/unlock-account', unlockAccount);
router.post('/check-login-security', checkLoginSecurity);

// ==========================================
// 📱 RUTAS DE SESIONES (Protegidas)
// ==========================================
router.post('/sessions/active', authenticateToken, getActiveSessions);
router.post('/sessions/revoke', authenticateToken, revokeSession);
router.post('/sessions/revoke-others', authenticateToken, revokeAllOtherSessions);
router.post('/sessions/revoke-all', authenticateToken, revokeAllSessions);

router.get('/validate-session', authenticateToken, validateSession);
router.post('/logout', authenticateToken, logout);

// ==========================================
// 🔐 RUTAS MFA
// ==========================================
router.post('/mfa/setup', authenticateToken, mfaController.setupMFA);
router.post('/mfa/verify-enable', authenticateToken, mfaController.verifyAndEnableMFA);
router.post('/mfa/verify-login', mfaController.verifyLoginMFA); 
router.post('/mfa/disable', authenticateToken, mfaController.disableMFA);
router.post('/mfa/status', authenticateToken, mfaController.checkMFAStatus);

// ==========================================
// 🛠️ RUTAS DE DIAGNÓSTICO
// ==========================================
router.get('/diagnostic/users-table', diagnosticCheckUsersTable);

export default router;