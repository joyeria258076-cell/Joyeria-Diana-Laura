import { Request, Response } from 'express';
// 👇 Importaciones corregidas (subiendo 2 niveles)
import * as userModel from '../../models/userModel';
import admin from '../../config/firebase';
import { LoginSecurityService } from '../../services/loginSecurityService';
import { pool } from '../../config/database';
import { SessionService } from '../../services/SessionService';
import { JWTService } from '../../services/JWTService';
import { CookieConfig } from '../../config/cookieConfig';
import { validateEmailSecurity, validatePasswordSecurity } from '../../utils/inputValidation';

// 🎯 Helpers internos para IP y User Agent
const getClientIp = (req: Request): string => {
  const ipHeaders = ['x-real-ip', 'x-forwarded-for', 'cf-connecting-ip', 'x-cluster-client-ip', 'x-forwarded', 'forwarded-for', 'forwarded'];
  for (const header of ipHeaders) {
    const value = req.headers[header];
    if (value) return Array.isArray(value) ? value[0].split(',')[0].trim() : value.split(',')[0].trim();
  }
  return req.connection.remoteAddress || req.socket.remoteAddress || (req.socket as any).remoteAddress || 'unknown';
};

const getUserAgent = (req: Request): string => req.get('User-Agent') || 'unknown';

// ==========================================
// 🔐 LOGIN (Inicio de Sesión Principal)
// ==========================================
export const login = async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);
  
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email es requerido' });
    }

    // 1. Validaciones de Seguridad (Inyección SQL/Scripts)
    const emailSecurityCheck = validateEmailSecurity(email);
    if (!emailSecurityCheck.valid) {
      console.log(`🚫 Intento de inyección detectado en email: ${emailSecurityCheck.message}`);
      return res.status(400).json({ success: false, message: emailSecurityCheck.message });
    }

    const passwordSecurityCheck = validatePasswordSecurity(password || '');
    if (!passwordSecurityCheck.valid) {
      console.log(`🚫 Intento de inyección detectado en contraseña: ${passwordSecurityCheck.message}`);
      return res.status(400).json({ success: false, message: passwordSecurityCheck.message });
    }

    console.log(`🔐 Procesando login para: ${email} desde IP: ${clientIp}`);

    // 2. Verificar si la cuenta está bloqueada por intentos fallidos
    const lockCheck = await LoginSecurityService.isAccountLocked(email);
    if (lockCheck.locked) {
      const remainingTime = Math.ceil((new Date(lockCheck.lockedUntil!).getTime() - Date.now()) / 60000);
      await LoginSecurityService.recordLoginAttempt({ 
        email, ip_address: clientIp, user_agent: userAgent, success: false, failure_reason: 'account_locked' 
      });
      return res.status(423).json({ 
        success: false, 
        message: `🔒 Cuenta bloqueada. Intenta en ${remainingTime} min.`, 
        locked: true, 
        lockedUntil: lockCheck.lockedUntil 
      });
    }

    // 3. Simulación de error (Honeypot para bots o pruebas)
    if (password === 'wrong_password_to_trigger_failure') {
      const lockResult = await LoginSecurityService.handleFailedAttempt(email);
      await LoginSecurityService.recordLoginAttempt({ 
        email, ip_address: clientIp, user_agent: userAgent, success: false, failure_reason: 'wrong_password' 
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Email o contraseña incorrectos.', 
        remainingAttempts: lockResult.remainingAttempts 
      });
    }

    // 4. Autenticación con Firebase y Base de Datos
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      
      // Verificar Email
      if (!userRecord.emailVerified) {
        await LoginSecurityService.recordLoginAttempt({ 
          email, ip_address: clientIp, user_agent: userAgent, success: false, failure_reason: 'email_not_verified' 
        });
        return res.status(401).json({ success: false, message: '📧 Tu email no está verificado.' });
      }

      // 5. Verificar MFA (Autenticación de dos factores)
      const userCheck = await pool.query('SELECT id, mfa_enabled FROM usuarios WHERE email = $1', [email]);
      if (userCheck.rows.length > 0 && userCheck.rows[0].mfa_enabled) {
        await LoginSecurityService.recordLoginAttempt({ 
          email, ip_address: clientIp, user_agent: userAgent, success: true, failure_reason: 'mfa_required' 
        });
        return res.status(200).json({ 
          success: false, 
          message: 'Se requiere código MFA', 
          mfaRequired: true, 
          userId: userCheck.rows[0].id, 
          email: email, 
          requiresMFA: true 
        });
      }

      // LOGIN EXITOSO - Registrar éxito y limpiar intentos fallidos
      await LoginSecurityService.recordLoginAttempt({ email, ip_address: clientIp, user_agent: userAgent, success: true });
      await LoginSecurityService.clearFailedAttempts(email);

      const userEmail = userRecord.email || email;
      const userName = userRecord.displayName || (userEmail ? userEmail.split('@')[0] : 'Usuario');
      
      let dbUser: any = null;
      try {
        // Obtener datos completos de PostgreSQL
        dbUser = await userModel.getUserByEmail(userEmail);
        
        if (dbUser?.id) {
          // Crear Sesión en BD
          const deviceInfo = SessionService.parseUserAgent(userAgent);
          const sessionResult = await SessionService.createSession(dbUser.id, userRecord.uid, deviceInfo, clientIp, userAgent);
          
          if (sessionResult.success && sessionResult.sessionToken) {
            // Generar JWT
            const token = JWTService.generateToken({ 
              userId: dbUser.id, 
              firebaseUid: userRecord.uid, 
              email: userEmail, 
              nombre: userName, 
              sessionId: sessionResult.sessionToken 
            });
            
            // Establecer Cookie HTTP-Only
            res.cookie('auth_token', token, CookieConfig.getConfig());
            
            return res.json({ 
              success: true, 
              message: 'Login exitoso', 
              data: { 
                user: { 
                  id: userRecord.uid, 
                  email: userEmail, 
                  nombre: userName, 
                  dbId: dbUser.id, 
                  rol: String(dbUser.rol || 'cliente') 
                }, 
                token: token, 
                sessionToken: sessionResult.sessionToken 
              } 
            });
          }
        }
      } catch (sessionError) { 
        console.error('❌ Error creando sesión:', sessionError); 
      }

      // Fallback si falla la sesión de base de datos pero Firebase funcionó
      return res.json({ 
        success: true, 
        message: 'Login exitoso (sin sesión completa)', 
        data: { 
          user: { 
            id: userRecord.uid, 
            email: userEmail, 
            nombre: userName, 
            rol: String(dbUser?.rol || 'cliente') 
          } 
        } 
      });

    } catch (firebaseError: any) {
      await LoginSecurityService.recordLoginAttempt({ 
        email, ip_address: clientIp, user_agent: userAgent, success: false, failure_reason: 'firebase_error' 
      });
      return res.status(401).json({ success: false, message: 'Credenciales inválidas o error de autenticación.' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ==========================================
// 🔄 SINCRONIZACIÓN Y ACTIVIDAD
// ==========================================
export const syncUserToPostgreSQL = async (req: Request, res: Response) => {
  try {
    const { email, password, nombre, firebaseUID } = req.body;
    if (!email || !firebaseUID) return res.status(400).json({ success: false, message: 'Datos requeridos faltantes' });

    const exists = await userModel.emailExists(email);
    if (exists) return res.json({ success: true, message: 'Usuario ya sincronizado', data: { email } });

    const success = await userModel.createUser(email, password || 'temp_123', nombre || email.split('@')[0], firebaseUID);
    if (success) res.json({ success: true, message: 'Usuario sincronizado', data: { email, firebaseUID } });
    else res.status(500).json({ success: false, message: 'Error al sincronizar' });
  } catch (error) {
    res.json({ success: true, message: 'Error no crítico en sincronización', data: { email: req.body.email } });
  }
};

export const updateUserActivity = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email requerido' });
    const success = await userModel.updateUserActivity(email);
    res.json({ success: !!success, message: success ? 'Actividad actualizada' : 'Error actualizando' });
  } catch (error) { res.status(500).json({ success: false, message: 'Error interno' }); }
};

// ==========================================
// 📱 GESTIÓN DE SESIONES
// ==========================================
export const validateSession = async (req: any, res: Response) => {
  try {
    res.json({ success: true, message: 'Sesión válida', data: { user: req.user, sessionId: req.sessionId } });
  } catch (error) { res.status(500).json({ success: false, message: 'Error validando sesión' }); }
};

export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID requerido' });
    const result = await SessionService.getActiveSessionsByUserId(userId);
    res.json({ success: result.success, data: result.success ? { sessions: result.sessions } : undefined, message: result.error });
  } catch (error) { res.status(500).json({ success: false, message: 'Error interno' }); }
};

export const revokeSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, userId } = req.body;
    if (!sessionId || !userId) return res.status(400).json({ success: false, message: 'Datos requeridos faltantes' });
    const result = await SessionService.revokeSessionById(sessionId);
    res.json({ success: result.success, message: result.success ? 'Sesión revocada' : result.error });
  } catch (error) { res.status(500).json({ success: false, message: 'Error interno' }); }
};

export const revokeAllOtherSessions = async (req: Request, res: Response) => {
  try {
    const { userId, currentSessionToken } = req.body;
    if (!userId || !currentSessionToken) return res.status(400).json({ success: false, message: 'Datos faltantes' });
    const result = await SessionService.revokeAllOtherSessions(userId, currentSessionToken);
    res.json({ success: result.success, message: `Revocadas ${result.revokedCount} sesiones`, data: { revokedCount: result.revokedCount } });
  } catch (error) { res.status(500).json({ success: false, message: 'Error interno' }); }
};

export const revokeAllSessions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'User ID requerido' });
    const result = await SessionService.revokeAllSessions(userId);
    res.json({ success: result.success, message: `Todas las sesiones revocadas`, data: { revokedCount: result.revokedCount } });
  } catch (error) { res.status(500).json({ success: false, message: 'Error interno' }); }
};

// ==========================================
// 🚪 LOGOUT
// ==========================================
export const logout = async (req: any, res: Response) => {
  try {
    const sessionToken = req.headers['x-session-token'] as string;
    
    // Invalidar sesión en Base de Datos
    if (sessionToken) {
        await SessionService.revokeSessionByToken(sessionToken);
    }
    
    // Limpiar Cookie del navegador
    res.clearCookie('auth_token', CookieConfig.getClearConfig());
    
    res.json({ success: true, message: 'Sesión cerrada exitosamente' });
  } catch (error) { 
    res.json({ success: true, message: 'Sesión cerrada (error revocando)' }); 
  }
};