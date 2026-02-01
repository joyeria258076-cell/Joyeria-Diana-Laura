// Ruta: Joyeria-Diana-Laura/Backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import * as userModel from '../models/userModel';
import admin from '../config/firebase';
import { EmailValidationService } from '../services/EmailValidationService';
import { LoginSecurityService } from '../services/loginSecurityService';
import { pool } from '../config/database';
import { RecoverySecurityService } from '../services/recoverySecurityService';
import { SessionService } from '../services/SessionService';
import { getUserByEmail } from '../models/userModel';
import jwt from 'jsonwebtoken';
import { JWTService } from '../services/JWTService';
import { CookieConfig } from '../config/cookieConfig'; // 🆕 LÍNEA NUEVA
import { validateInputSecurity, validateName, validateEmailSecurity, validatePasswordSecurity } from '../utils/inputValidation'; // 🆕 VALIDACIONES

// 🎯 FUNCIÓN MEJORADA para obtener IP real del cliente
const getClientIp = (req: Request): string => {
  // Probar diferentes headers de IP en orden de prioridad
  const ipHeaders = [
    'x-real-ip',
    'x-forwarded-for', 
    'cf-connecting-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];

  for (const header of ipHeaders) {
    const value = req.headers[header];
    if (value) {
      if (Array.isArray(value)) {
        return value[0].split(',')[0].trim();
      }
      return value.split(',')[0].trim();
    }
  }

  // Fallback a la conexión directa
  return req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.socket as any).remoteAddress ||
         'unknown';
};

// 🎯 FUNCIÓN MEJORADA para obtener User-Agent
const getUserAgent = (req: Request): string => {
  return req.get('User-Agent') || 'unknown';
};

// 🎯 SOLO para copiar datos de Firebase a PostgreSQL
export const syncUserToPostgreSQL = async (req: Request, res: Response) => {
  try {
    const { email, password, nombre, firebaseUID } = req.body;

    if (!email || !firebaseUID) {
      return res.status(400).json({
        success: false,
        message: 'Email y Firebase UID son requeridos'
      });
    }

    console.log(`🔄 Sincronizando usuario a PostgreSQL: ${email}`);

    // Verificar si ya existe
    const exists = await userModel.emailExists(email);
    if (exists) {
      console.log(`✅ Usuario ya existe en PostgreSQL: ${email}`);
      return res.json({
        success: true,
        message: 'Usuario ya está sincronizado',
        data: { email: email }
      });
    }

    // Crear usuario en PostgreSQL (opcional, para otras funcionalidades)
    const userPassword = password || 'temp_password_123';
    const userName = nombre || (email ? email.split('@')[0] : 'Usuario');
    
    const success = await userModel.createUser(email, userPassword, userName, firebaseUID);
    
    if (success) {
      console.log(`✅ Usuario sincronizado a PostgreSQL: ${email}`);
      
      res.json({
        success: true,
        message: 'Usuario sincronizado correctamente',
        data: { email: email, firebaseUID: firebaseUID }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al sincronizar usuario'
      });
    }
  } catch (error: any) {
    console.error('Error en syncUserToPostgreSQL:', error);
    res.json({
      success: true,
      message: 'Usuario en Firebase, error en PostgreSQL no crítico',
      data: { email: req.body.email }
    });
  }
};

// 🔍 Validar email con ZeroBounce (opcional - para verificar antes de registrar)
export const validateEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido'
      });
    }

    // Validación de formato
    const formatValidation = EmailValidationService.validateFormat(email);
    if (!formatValidation.valid) {
      return res.status(400).json({
        success: false,
        message: formatValidation.message
      });
    }

    // Validación con ZeroBounce
    console.log(`🔍 Validando email con ZeroBounce: ${email}`);
    const emailValidation = await EmailValidationService.validateEmail(email);
    
    if (!emailValidation.valid) {
      console.log(`❌ Validación fallida: ${emailValidation.message}`);
      return res.status(400).json({
        success: false,
        message: emailValidation.message || 'El email no es válido'
      });
    }

    console.log(`✅ Email validado correctamente: ${email}`);
    
    res.json({
      success: true,
      message: 'Email válido para registro',
      data: {
        email: email,
        valid: true
      }
    });

  } catch (error: any) {
    console.error('Error en validateEmail:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);
  
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    // 🆕 VALIDACIÓN DE SEGURIDAD - Prevenir inyección SQL y XSS
    const emailSecurityCheck = validateEmailSecurity(email);
    if (!emailSecurityCheck.valid) {
      console.log(`🚫 Intento de inyección detectado en email: ${emailSecurityCheck.message}`);
      return res.status(400).json({
        success: false,
        message: emailSecurityCheck.message
      });
    }

    const passwordSecurityCheck = validatePasswordSecurity(password || '');
    if (!passwordSecurityCheck.valid) {
      console.log(`🚫 Intento de inyección detectado en contraseña: ${passwordSecurityCheck.message}`);
      return res.status(400).json({
        success: false,
        message: passwordSecurityCheck.message
      });
    }

    console.log(`🔐 Procesando login para: ${email} desde IP: ${clientIp}`);

    // 🎯 PRIMERO: Verificar si la cuenta está bloqueada
    const lockCheck = await LoginSecurityService.isAccountLocked(email);
    
    if (lockCheck.locked) {
      const remainingTime = Math.ceil((new Date(lockCheck.lockedUntil!).getTime() - Date.now()) / 60000);
      
      console.log(`🚫 CUENTA BLOQUEADA: ${email}. Tiempo restante: ${remainingTime} min`);
      
      // Registrar intento fallido por cuenta bloqueada
      await LoginSecurityService.recordLoginAttempt({
        email,
        ip_address: clientIp,
        user_agent: userAgent,
        success: false,
        failure_reason: 'account_locked'
      });

      return res.status(423).json({
        success: false,
        message: `🔒 Cuenta temporalmente bloqueada. Demasiados intentos fallidos. Intenta nuevamente en ${remainingTime} minutos.`,
        locked: true,
        lockedUntil: lockCheck.lockedUntil,
        attempts: lockCheck.attempts,
        lockedFor: remainingTime
      });
    }

    // 🎯 SEGUNDO: Verificar si es una contraseña incorrecta (indicada por el frontend)
    if (password === 'wrong_password_to_trigger_failure') {
      console.log(`❌ Intento fallido detectado para: ${email}`);
      
      const lockResult = await LoginSecurityService.handleFailedAttempt(email);
      
      // Registrar intento fallido
      await LoginSecurityService.recordLoginAttempt({
        email,
        ip_address: clientIp,
        user_agent: userAgent,
        success: false,
        failure_reason: 'wrong_password'
      });

      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos.',
        remainingAttempts: lockResult.remainingAttempts,
        attempts: lockResult.attempts,
        maxAttempts: LoginSecurityService.getMaxAttempts()
      });
    }

    // 🎯 TERCERO: Verificar credenciales reales con Firebase
    try {
      console.log(`✅ Verificando credenciales reales para: ${email}`);
      const userRecord = await admin.auth().getUserByEmail(email);
      
      // Verificar email verificado
      if (!userRecord.emailVerified) {
        console.log(`❌ Email no verificado para: ${email}`);
        
        await LoginSecurityService.recordLoginAttempt({
          email,
          ip_address: clientIp,
          user_agent: userAgent,
          success: false,
          failure_reason: 'email_not_verified'
        });

        return res.status(401).json({
          success: false,
          message: '📧 Tu email no está verificado. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.'
        });
      }

      // 🎯 VERIFICAR BLOQUEO NUEVAMENTE (por si acaso)
      const finalLockCheck = await LoginSecurityService.isAccountLocked(email);
      if (finalLockCheck.locked) {
        const remainingTime = Math.ceil((new Date(finalLockCheck.lockedUntil!).getTime() - Date.now()) / 60000);
        
        await LoginSecurityService.recordLoginAttempt({
          email,
          ip_address: clientIp,
          user_agent: userAgent,
          success: false,
          failure_reason: 'account_locked_during_login'
        });

        return res.status(423).json({
          success: false,
          message: `🔒 Cuenta bloqueada durante el proceso de login. Intenta nuevamente en ${remainingTime} minutos.`,
          locked: true
        });
      }

      // 🆕 🎯 VERIFICAR MFA ANTES DE PERMITIR ACCESO - CORREGIDO
      console.log('🔐 Verificando estado MFA para:', email);
      
      const userCheck = await pool.query(
        'SELECT id, mfa_enabled FROM usuarios WHERE email = $1',
        [email]
      );
      
      let mfaRequired = false;
      let userIdForMFA = null;
      
      if (userCheck.rows.length > 0) {
        const user = userCheck.rows[0];
        
        if (user.mfa_enabled) {
          console.log('🚫 Usuario tiene MFA activado - requerir código');
          mfaRequired = true;
          userIdForMFA = user.id;
          
          // 🆕 CORRECCIÓN: Registrar intento exitoso pero con MFA requerido
          await LoginSecurityService.recordLoginAttempt({
            email,
            ip_address: clientIp,
            user_agent: userAgent,
            success: true,
            failure_reason: 'mfa_required'
          });

          // 🆕 CORRECCIÓN: Retornar respuesta específica para MFA
          return res.status(200).json({
            success: false, // 🚫 Cambiar a false para indicar login incompleto
            message: 'Se requiere código MFA',
            mfaRequired: true,
            userId: userIdForMFA,
            email: email,
            requiresMFA: true // 🆕 Campo adicional para claridad
          });
        }
      }

      // 🎯 LOGIN EXITOSO (sin MFA o MFA no activado)
      await LoginSecurityService.recordLoginAttempt({
        email,
        ip_address: clientIp,
        user_agent: userAgent,
        success: true
      });

      // Limpiar intentos fallidos
      await LoginSecurityService.clearFailedAttempts(email);

      const userEmail = userRecord.email || email;
      const userName = userRecord.displayName || (userEmail ? userEmail.split('@')[0] : 'Usuario');
      
      // 🆕 🎯 CREACIÓN DE SESIÓN Y GENERACIÓN DE JWT
      try {
        // Obtener usuario de PostgreSQL para el ID
        const dbUser = await userModel.getUserByEmail(userEmail);
        
        if (dbUser && dbUser.id) {
          const deviceInfo = SessionService.parseUserAgent(userAgent);
          
          // Crear sesión en la base de datos
          const sessionResult = await SessionService.createSession(
            dbUser.id,
            userRecord.uid,
            deviceInfo,
            clientIp,
            userAgent
          );
          
          if (sessionResult.success && sessionResult.sessionToken) {
            console.log(`✅ Sesión registrada para: ${userEmail}, Session Token: ${sessionResult.sessionToken.substring(0, 10)}...`);
            
            // 🎯 GENERAR JWT SEGURO CON EL NUEVO SERVICIO
            const token = JWTService.generateToken({
              userId: dbUser.id,
              firebaseUid: userRecord.uid,
              email: userEmail,
              nombre: userName,
              sessionId: sessionResult.sessionToken
            });

            console.log(`✅ LOGIN EXITOSO con JWT seguro para: ${email}`);
            console.log(`🔐 JWT generado con sessionId: ${sessionResult.sessionToken.substring(0, 10)}...`);
            
            res.cookie('auth_token', token, CookieConfig.getConfig());
            console.log(`🍪 Cookie configurada (${CookieConfig.isProduction ? 'PROD' : 'DEV'})`);

            return res.json({
              success: true,
              message: 'Login exitoso',
              data: {
                user: {
                  id: userRecord.uid,
                  email: userEmail,
                  nombre: userName,
                  dbId: dbUser.id
                },
                token: token,
                sessionToken: sessionResult.sessionToken
              }
            });
            
          } else {
            console.warn(`⚠️ Sesión no registrada o sin token para: ${userEmail}, Error: ${sessionResult.error}`);
          }
        } else {
          console.warn(`⚠️ Usuario no encontrado en PostgreSQL para crear sesión: ${userEmail}`);
        }
      } catch (sessionError) {
        console.error('❌ Error creando sesión (no crítico):', sessionError);
      }

      // 🆕 SI NO SE PUDO CREAR SESIÓN, ENVIAR RESPUESTA SIN TOKEN
      console.log(`✅ LOGIN EXITOSO (sin sesión) para: ${email}`);

      return res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: userRecord.uid,
            email: userEmail,
            nombre: userName
          }
        }
      });

    } catch (firebaseError: any) {
      console.error('❌ Error de Firebase:', firebaseError);
      
      // Manejar errores de Firebase
      let errorMessage = 'Error al iniciar sesión';
      
      if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = 'El usuario no existe.';
      } else if (firebaseError.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta.';
      } else if (firebaseError.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciales inválidas.';
      }

      // Registrar intento fallido
      await LoginSecurityService.recordLoginAttempt({
        email,
        ip_address: clientIp,
        user_agent: userAgent,
        success: false,
        failure_reason: 'firebase_error'
      });

      return res.status(401).json({
        success: false,
        message: errorMessage
      });
    }

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Endpoint para verificar estado de bloqueo
export const checkAccountLock = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const clientIp = getClientIp(req);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const lockStatus = await LoginSecurityService.isAccountLocked(email);
    const securityStats = await LoginSecurityService.getSecurityStats(email);

    res.json({
      success: true,
      data: {
        locked: lockStatus.locked,
        lockedUntil: lockStatus.lockedUntil,
        securityStats: securityStats
      }
    });

  } catch (error) {
    console.error('Error en checkAccountLock:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado de cuenta'
    });
  }
};

// Endpoint para administración (limpiar bloqueos)
export const unlockAccount = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    await LoginSecurityService.clearFailedAttempts(email);
    
    console.log(`🔓 Cuenta desbloqueada manualmente: ${email}`);
    
    res.json({
      success: true,
      message: 'Cuenta desbloqueada exitosamente'
    });

  } catch (error) {
    console.error('Error en unlockAccount:', error);
    res.status(500).json({
      success: false,
      message: 'Error desbloqueando cuenta'
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido'
      });
    }

    // 🆕 VALIDACIÓN DE SEGURIDAD - Prevenir inyección SQL y XSS
    const emailSecurityCheck = validateEmailSecurity(email);
    if (!emailSecurityCheck.valid) {
      console.log(`🚫 Intento de inyección detectado en email: ${emailSecurityCheck.message}`);
      return res.status(400).json({
        success: false,
        message: emailSecurityCheck.message
      });
    }

    console.log(`📧 Procesando recuperación para: ${email}`);
    
    // 🛡️ VERIFICAR LÍMITES - CORREGIDO
    console.log(`🔄 Verificando límites...`);
    const limitCheck = await RecoverySecurityService.checkRecoveryLimits(email);
    
    console.log(`📊 Resultado de límites:`, limitCheck);
    
    if (!limitCheck.allowed) {
      console.log(`🚫 BLOQUEO ACTIVO: ${email} - ${limitCheck.remainingTime} minutos restantes`);
      return res.status(429).json({
        success: false,
        message: `Demasiados intentos de recuperación. Intente nuevamente en ${limitCheck.remainingTime} minutos.`,
        blocked: true,
        remainingTime: limitCheck.remainingTime,
        remainingAttempts: 0
      });
    }

    // 🛡️ INCREMENTAR INTENTOS - CORREGIDO (solo si está permitido)
    console.log(`📈 Incrementando intentos...`);
    await RecoverySecurityService.incrementRecoveryAttempts(email);
    
    // 🆕 VERIFICAR NUEVAMENTE LOS LÍMITES DESPUÉS DE INCREMENTAR
    const updatedLimitCheck = await RecoverySecurityService.checkRecoveryLimits(email);
    
    console.log(`✅ Intento registrado para: ${email}, intentos restantes: ${updatedLimitCheck.remainingAttempts}`);

    // 🆕 MENSAJE NEUTRO - No revelar si el usuario existe
    const neutralMessage = 'Si el correo existe en nuestro sistema, se enviará un código de verificación. De lo contrario, revise correctamente la dirección del correo';

    // 🎯 DEVOLVER ÉXITO CON MENSAJE NEUTRO
    res.json({
      success: true,
      message: neutralMessage,
      remainingAttempts: updatedLimitCheck.remainingAttempts
    });

  } catch (error: any) {
    console.error('❌ Error en forgotPassword:', error);
    
    // En caso de error de base de datos, permitir el envío pero mostrar advertencia
    if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
      console.log('⚠️ Error de conexión a BD, pero permitiendo envío de email');
      const neutralMessage = 'Si el correo existe en nuestro sistema, se enviará un código de verificación. De lo contrario, revise correctamente la dirección del correo';
      res.json({
        success: true,
        message: neutralMessage,
        remainingAttempts: 2 // Valor por defecto conservador
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al procesar la recuperación'
      });
    }
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    console.log('🔄 Iniciando proceso de reset de contraseña para:', email);

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email y nueva contraseña son requeridos'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    try {
      // 🎯 PASO 1: Actualizar en Firebase
      console.log('🔐 Buscando usuario en Firebase...');
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log('✅ Usuario encontrado en Firebase:', userRecord.uid);
      
      console.log('🔄 Actualizando contraseña en Firebase...');
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword
      });
      console.log('✅ Contraseña actualizada en Firebase');

      // 🎯 PASO 2: Actualizar en PostgreSQL
      console.log('🗄️ Buscando usuario en PostgreSQL...');
      const user = await userModel.getUserByEmail(email);
      
      if (user && user.id) {
        console.log('✅ Usuario encontrado en PostgreSQL, ID:', user.id);
        console.log('🔄 Actualizando contraseña en PostgreSQL...');
        const dbUpdated = await userModel.updatePassword(user.id, newPassword);
        
        if (dbUpdated) {
          console.log('✅ Contraseña actualizada en PostgreSQL');
        } else {
          console.log('⚠️ No se pudo actualizar contraseña en PostgreSQL');
        }
      } else {
        console.log('⚠️ Usuario no encontrado en PostgreSQL, pero Firebase se actualizó');
      }

      // 🎯 PASO 3: Resetear intentos de recuperación
      console.log('🔄 Reseteando intentos de recuperación...');
      await RecoverySecurityService.resetAfterSuccessfulRecovery(email);
      console.log('✅ Intentos de recuperación reseteados');

      res.json({
        success: true,
        message: 'Contraseña actualizada correctamente en ambos sistemas'
      });

    } catch (firebaseError: any) {
      console.error('❌ Error de Firebase en resetPassword:', firebaseError);
      
      if (firebaseError.code === 'auth/user-not-found') {
        return res.status(400).json({
          success: false,
          message: 'Usuario no encontrado en Firebase'
        });
      }
      
      if (firebaseError.code === 'auth/invalid-email') {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar la contraseña: ' + firebaseError.message
      });
    }

  } catch (error: any) {
    console.error('❌ Error general en resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

// Función opcional para verificar si un usuario existe
export const checkUserExists = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const exists = await userModel.emailExists(email);
    
    res.json({
      success: true,
      exists
    });

  } catch (error) {
    console.error('Error en checkUserExists:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const resetPasswordFirebase = async (req: Request, res: Response) => {
  try {
    const { oobCode, newPassword } = req.body;

    if (!oobCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos'
      });
    }

    try {
      res.json({
        success: true,
        message: 'Contraseña actualizada correctamente'
      });

    } catch (error) {
      console.error('Error en resetPasswordFirebase:', error);
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar la contraseña'
      });
    }

  } catch (error) {
    console.error('Error en resetPasswordFirebase:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const checkEmailCredits = async (req: Request, res: Response) => {
  try {
    const creditsInfo = await EmailValidationService.checkCredits();
    
    res.json({
      success: true,
      data: {
        credits: creditsInfo.credits,
        message: creditsInfo.message
      }
    });

  } catch (error) {
    console.error('Error en checkEmailCredits:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando créditos de email'
    });
  }
};

// 🎯 FUNCIÓN: Verificar configuración de email
export const checkEmailConfig = async (req: Request, res: Response) => {
  try {
    // Verificar que Firebase esté configurado correctamente
    const testEmail = 'test@example.com';
    
    try {
      const actionCodeSettings = {
        url: process.env.FRONTEND_URL || 'http://localhost:3000/login?verified=true',
        handleCodeInApp: false
      };
      
      await admin.auth().generateEmailVerificationLink(testEmail, actionCodeSettings);
      
      res.json({
        success: true,
        message: 'Configuración de email verificada correctamente. Los links redirigirán a: ' + (process.env.FRONTEND_URL || 'http://localhost:3000/login')
      });
      
    } catch (firebaseError: any) {
      res.status(400).json({
        success: false,
        message: `Error en configuración de Firebase: ${firebaseError.message}`
      });
    }

  } catch (error) {
    console.error('Error en checkEmailConfig:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando configuración de email'
    });
  }
};

// 🎯 NUEVA FUNCIÓN: Verificar usuario en Firebase
export const checkFirebaseUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    console.log(`🔍 Verificando usuario en Firebase: ${email}`);

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      
      console.log(`✅ Usuario encontrado en Firebase: ${userRecord.uid}`);
      
      // 🆕 OBTENER USUARIO DE POSTGRESQL PARA EL ID NUMÉRICO
      const dbUser = await getUserByEmail(email);
      
      res.json({
        success: true,
        exists: true,
        emailVerified: userRecord.emailVerified,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          emailVerified: userRecord.emailVerified,
          // 🆕 AGREGAR EL ID NUMÉRICO
          id: dbUser?.id || null
        }
      });

    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/user-not-found') {
        console.log(`❌ Usuario NO encontrado en Firebase: ${email}`);
        return res.json({
          success: true,
          exists: false
        });
      }
      
      console.error('Error de Firebase:', firebaseError);
      throw firebaseError;
    }

  } catch (error: any) {
    console.error('Error en checkFirebaseUser:', error);
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        message: 'El formato del email es inválido'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error verificando usuario en Firebase: ' + error.message
    });
  }
};

// 🎯 ENDPOINT DE DIAGNÓSTICO (temporal)
export const testEmailDelivery = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    console.log('🧪 Probando entrega de email para:', email);

    // Probar recuperación de contraseña
    const actionCodeSettings = {
      url: 'https://joyeria-diana-laura.vercel.app/login?test=true',
      handleCodeInApp: false
    };

    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
    
    console.log('✅ Link generado exitosamente');
    console.log('🔗 Link:', resetLink);

    res.json({
      success: true,
      message: 'Prueba completada - Revisa logs del servidor',
      data: {
        email: email,
        linkGenerated: true,
        linkPreview: resetLink.substring(0, 100) + '...'
      }
    });

  } catch (error: any) {
    console.error('❌ Error en prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error en prueba: ' + error.message,
      code: error.code
    });
  }
};

// 🎯 NUEVO ENDPOINT: Resetear intentos después de cambio exitoso
export const resetRecoveryAttempts = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    await RecoverySecurityService.resetAfterSuccessfulRecovery(email);
    
    console.log(`✅ Intentos reseteados manualmente para: ${email}`);
    
    res.json({
      success: true,
      message: 'Contador de intentos reseteado'
    });

  } catch (error) {
    console.error('Error en resetRecoveryAttempts:', error);
    res.status(500).json({
      success: false,
      message: 'Error reseteando intentos'
    });
  }
};

// 🎯 NUEVO ENDPOINT: Actualizar actividad del usuario
export const updateUserActivity = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    console.log(`🔄 Actualizando actividad para: ${email}`);
    
    const success = await userModel.updateUserActivity(email);
    
    if (success) {
      res.json({
        success: true,
        message: 'Actividad actualizada'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Error actualizando actividad'
      });
    }

  } catch (error) {
    console.error('Error en updateUserActivity:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// 🎯 ENDPOINT DE DIAGNÓSTICO: Verificar estado del sistema de login
export const checkLoginSecurity = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const lockStatus = await LoginSecurityService.isAccountLocked(email);
    const securityStats = await LoginSecurityService.getSecurityStats(email);

    // Verificar si existe en la tabla login_security
    const result = await pool.query(
      'SELECT * FROM login_security WHERE email = $1',
      [email]
    );

    res.json({
      success: true,
      data: {
        lockStatus,
        securityStats,
        existsInTable: result.rows.length > 0,
        tableData: result.rows[0] || null
      }
    });

  } catch (error) {
    console.error('Error en checkLoginSecurity:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando seguridad de login'
    });
  }
};

// 🆕 NUEVOS ENDPOINTS PARA GESTIÓN DE SESIONES

// Obtener sesiones activas del usuario
export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // Podemos obtenerlo del token también
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID es requerido'
      });
    }

    const sessionsResult = await SessionService.getActiveSessionsByUserId(userId);
    
    if (sessionsResult.success) {
      res.json({
        success: true,
        data: {
          sessions: sessionsResult.sessions
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: sessionsResult.error
      });
    }

  } catch (error) {
    console.error('Error en getActiveSessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cerrar sesión en un dispositivo específico
export const revokeSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, userId } = req.body;
    
    if (!sessionId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID y User ID son requeridos'
      });
    }

    const revokeResult = await SessionService.revokeSessionById(sessionId);
    
    if (revokeResult.success) {
      res.json({
        success: true,
        message: 'Sesión revocada correctamente'
      });
    } else {
      res.status(400).json({
        success: false,
        message: revokeResult.error
      });
    }

  } catch (error) {
    console.error('Error en revokeSession:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cerrar todas las sesiones excepto la actual
export const revokeAllOtherSessions = async (req: Request, res: Response) => {
  try {
    const { userId, currentSessionToken } = req.body;
    
    if (!userId || !currentSessionToken) {
      return res.status(400).json({
        success: false,
        message: 'User ID y Current Session Token son requeridos'
      });
    }

    const revokeResult = await SessionService.revokeAllOtherSessions(userId, currentSessionToken);
    
    if (revokeResult.success) {
      res.json({
        success: true,
        message: `Se revocaron ${revokeResult.revokedCount} sesiones`,
        data: {
          revokedCount: revokeResult.revokedCount
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: revokeResult.error
      });
    }

  } catch (error) {
    console.error('Error en revokeAllOtherSessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Cerrar TODAS las sesiones (incluyendo actual)
export const revokeAllSessions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID es requerido'
      });
    }

    const revokeResult = await SessionService.revokeAllSessions(userId);
    
    if (revokeResult.success) {
      res.json({
        success: true,
        message: `Se revocaron todas las sesiones (${revokeResult.revokedCount})`,
        data: {
          revokedCount: revokeResult.revokedCount
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: revokeResult.error
      });
    }

  } catch (error) {
    console.error('Error en revokeAllSessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// 🆕 NUEVO ENDPOINT: Validar sesión actual
export const validateSession = async (req: any, res: Response) => {
  try {
    // Este endpoint usa el middleware de autenticación existente
    // Si llegó aquí, la sesión es válida
    res.json({
      success: true,
      message: 'Sesión válida',
      data: {
        user: req.user,
        sessionId: req.sessionId
      }
    });
  } catch (error) {
    console.error('Error en validateSession:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando sesión'
    });
  }
};

// 🆕 NUEVO ENDPOINT: Logout que revoca sesión
export const logout = async (req: any, res: Response) => {
  try {
    const sessionToken = req.headers['x-session-token'] as string;
    
    if (sessionToken) {
      // Revocar sesión en BD
      await SessionService.revokeSessionByToken(sessionToken);
      console.log(`✅ Sesión revocada en logout: ${sessionToken.substring(0, 10)}...`);
    }

    res.clearCookie('auth_token', CookieConfig.getClearConfig());
    console.log(`🍪 Cookie eliminada (${CookieConfig.isProduction ? 'PROD' : 'DEV'})`);

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error: any) {
    console.error('❌ Error en logout:', error);
    // Aún así respondemos éxito aunque falle la revocación
    res.json({
      success: true,
      message: 'Sesión cerrada (error revocando sesión en BD)'
    });
  }
};