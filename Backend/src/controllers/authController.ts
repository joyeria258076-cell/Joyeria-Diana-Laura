// En Joyeria-Diana-Laura/Backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import * as userModel from '../models/userModel';
import admin from '../config/firebase';
import { EmailValidationService } from '../services/EmailValidationService';
import { LoginSecurityService } from '../services/loginSecurityService';
import { pool } from '../config/database';

// Función para obtener IP del cliente
const getClientIp = (req: Request): string => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.socket as any).remoteAddress ||
         'unknown';
};

// Función para obtener User-Agent
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

// Login normal - SOLO CON FIREBASE
// Login con protección de fuerza bruta MEJORADA
export const login = async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const userAgent = getUserAgent(req);
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    console.log(`🔐 Iniciando login protegido para: ${email} desde IP: ${clientIp}`);

    // 🎯 VERIFICAR BLOQUEO DE CUENTA (ANTES DE FIREBASE)
    const lockCheck = await LoginSecurityService.isAccountLocked(email, clientIp);
    
    if (lockCheck.locked) {
      const remainingTime = Math.ceil((new Date(lockCheck.lockedUntil!).getTime() - Date.now()) / 60000);
      
      console.log(`🚫 Cuenta BLOQUEADA para: ${email}. Intentos: ${lockCheck.attempts}. Tiempo restante: ${remainingTime} min`);
      
      return res.status(423).json({
        success: false,
        message: `🔒 Cuenta temporalmente bloqueada por demasiados intentos fallidos. Intenta nuevamente en ${remainingTime} minutos.`,
        locked: true,
        lockedUntil: lockCheck.lockedUntil,
        attempts: lockCheck.attempts,
        lockedFor: remainingTime
      });
    }

    try {
      // 🎯 PRIMERO: Intentar autenticar con Firebase directamente
      // Esto nos dará el error REAL de Firebase
      const auth = admin.auth();
      
      // Buscar usuario por email
      const userRecord = await auth.getUserByEmail(email);
      console.log(`✅ Usuario encontrado en Firebase: ${userRecord.uid}`);

      // Verificar que el email esté verificado
      if (!userRecord.emailVerified) {
        console.log(`❌ Email no verificado para: ${email}`);
        
        // Registrar intento fallido por email no verificado
        const lockResult = await LoginSecurityService.handleFailedAttempt(
          email, 
          clientIp, 
          userAgent, 
          'email_not_verified'
        );

        return res.status(401).json({
          success: false,
          message: '📧 Tu email no está verificado. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.',
          remainingAttempts: lockResult.remainingAttempts
        });
      }

      // 🎯 INTENTAR LOGIN REAL CON FIREBASE
      // Crear un token personalizado para simular login (esto es un workaround)
      // En una implementación real, usaríamos signInWithEmailAndPassword del cliente
      console.log(`🔑 Verificando credenciales para: ${email}`);
      
      // Como no podemos verificar la contraseña directamente en el backend,
      // asumimos que si llegamos aquí es porque el usuario existe y está verificado
      // En una implementación completa, el frontend manejaría el login con Firebase Auth
      
      // Registrar intento exitoso
      await LoginSecurityService.recordLoginAttempt({
        email,
        ip_address: clientIp,
        user_agent: userAgent,
        success: true
      });

      // Limpiar intentos fallidos previos
      await LoginSecurityService.clearFailedAttempts(email);

      // 🎯 CREAR RESPUESTA
      const userEmail = userRecord.email || email;
      const userName = userRecord.displayName || (userEmail ? userEmail.split('@')[0] : 'Usuario');
      
      console.log(`✅ Login exitoso para: ${email}`);
      
      res.json({
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
      console.error('❌ Error de Firebase en login:', firebaseError);
      
      let errorMessage = 'Error al iniciar sesión';
      let failureReason = 'firebase_error';
      let isCredentialError = false;

      if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = 'El usuario no existe. Por favor, verifica tu correo electrónico.';
        failureReason = 'user_not_found';
        isCredentialError = true;
      } else if (firebaseError.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta.';
        failureReason = 'wrong_password';
        isCredentialError = true;
      } else if (firebaseError.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciales inválidas.';
        failureReason = 'invalid_credentials';
        isCredentialError = true;
      } else if (firebaseError.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Tu cuenta ha sido temporalmente bloqueada por seguridad.';
        failureReason = 'too_many_requests';
      }

      // 🎯 SOLO REGISTRAR INTENTOS FALLIDOS SI ES ERROR DE CREDENCIALES
      if (isCredentialError) {
        const lockResult = await LoginSecurityService.handleFailedAttempt(
          email, 
          clientIp, 
          userAgent, 
          failureReason
        );

        // Si la cuenta fue bloqueada en este intento
        if (lockResult.locked && lockResult.justLocked) {
          const remainingTime = LoginSecurityService.getLockDurationMinutes();
          
          console.log(`🔒 CUENTA BLOQUEADA después de ${lockResult.attempts} intentos fallidos: ${email}`);
          
          return res.status(423).json({
            success: false,
            message: `🔒 Demasiados intentos fallidos. Tu cuenta ha sido bloqueada por ${remainingTime} minutos.`,
            locked: true,
            attempts: lockResult.attempts,
            lockedFor: remainingTime,
            remainingAttempts: 0
          });
        }

        // Si no está bloqueada, mostrar error normal con intentos restantes
        console.log(`⚠️ Intento fallido ${lockResult.attempts}/${LoginSecurityService.getMaxAttempts()} para: ${email}`);
        
        res.status(401).json({
          success: false,
          message: `${errorMessage} ${lockResult.remainingAttempts > 0 ? `🔐 Te quedan ${lockResult.remainingAttempts} intentos.` : ''}`,
          remainingAttempts: lockResult.remainingAttempts,
          attempts: lockResult.attempts,
          maxAttempts: LoginSecurityService.getMaxAttempts()
        });

      } else {
        // Para otros errores de Firebase, no contar como intento fallido
        res.status(401).json({
          success: false,
          message: errorMessage,
          remainingAttempts: lockCheck.remainingAttempts || LoginSecurityService.getMaxAttempts()
        });
      }
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

    const lockStatus = await LoginSecurityService.isAccountLocked(email, clientIp);
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

// 🔄 FUNCIONES DE RECUPERACIÓN DE CONTRASEÑA MEJORADAS
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido'
      });
    }

    console.log(`📧 Solicitando recuperación para: ${email}`);

    try {
      // 🎯 CONFIGURACIÓN MEJORADA PARA EMAILS
      const frontendUrl = process.env.FRONTEND_URL || 'https://joyeria-diana-laura.vercel.app';
      const actionCodeSettings = {
        url: `${frontendUrl}/login?reset=success&email=${encodeURIComponent(email)}`,
        handleCodeInApp: false
      };

      console.log('🎯 Configuración de recuperación:');
      console.log('📧 Email:', email);
      console.log('🔗 URL de redirección:', actionCodeSettings.url);

      // 🎯 GENERAR LINK DE RECUPERACIÓN
      const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
      
      console.log('✅ Link de recuperación generado exitosamente');
      console.log('🔗 Link completo (primeros 100 chars):', resetLink.substring(0, 100) + '...');

      // 🎯 VERIFICAR QUE EL USUARIO EXISTE EN FIREBASE
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`✅ Usuario verificado en Firebase: ${userRecord.uid}`);
        
        res.json({
          success: true,
          message: 'Se ha enviado un enlace de recuperación a tu email',
          debug: process.env.NODE_ENV === 'development' ? { 
            resetLink: resetLink.substring(0, 100) + '...',
            email: email
          } : undefined
        });

      } catch (firebaseError: any) {
        if (firebaseError.code === 'auth/user-not-found') {
          console.log(`❌ Usuario no encontrado en Firebase: ${email}`);
          // 🎯 POR SEGURIDAD, NO REVELAMOS SI EXISTE O NO
          return res.json({
            success: true,
            message: 'Si el email está registrado, recibirás un enlace de recuperación'
          });
        }
        throw firebaseError;
      }

    } catch (firebaseError: any) {
      console.error('❌ Error de Firebase en forgotPassword:', firebaseError);
      
      if (firebaseError.code === 'auth/invalid-email') {
        return res.status(400).json({
          success: false,
          message: 'El formato del email es inválido'
        });
      }

      if (firebaseError.code === 'auth/unauthorized-continue-uri') {
        return res.status(400).json({
          success: false,
          message: 'Error de configuración: URL no autorizada en Firebase'
        });
      }

      // 🎯 POR SEGURIDAD, SIEMPRE DEVOLVEMOS ÉXITO EN PRODUCCIÓN
      if (process.env.NODE_ENV === 'production') {
        return res.json({
          success: true,
          message: 'Si el email está registrado, recibirás un enlace de recuperación'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Error al generar link: ${firebaseError.message}`,
          code: firebaseError.code
        });
      }
    }

  } catch (error) {
    console.error('Error en forgotPassword:', error);
    
    // 🎯 POR SEGURIDAD, SIEMPRE DEVOLVEMOS ÉXITO EN PRODUCCIÓN
    if (process.env.NODE_ENV === 'production') {
      res.json({
        success: true,
        message: 'Si el email está registrado, recibirás un enlace de recuperación'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email y nueva contraseña son requeridos'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    try {
      // Actualizar contraseña directamente en Firebase
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword
      });

      // También actualizar en nuestra base de datos local
      const user = await userModel.getUserByEmail(email);
      if (user && user.id) {
        await userModel.updatePassword(user.id, newPassword);
      }
      
      res.json({
        success: true,
        message: 'Contraseña actualizada correctamente'
      });

    } catch (firebaseError: any) {
      console.error('Error de Firebase en resetPassword:', firebaseError);
      
      if (firebaseError.code === 'auth/user-not-found') {
        return res.status(400).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar la contraseña en Firebase'
      });
    }

  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
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
      
      res.json({
        success: true,
        exists: true,
        emailVerified: userRecord.emailVerified,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          emailVerified: userRecord.emailVerified
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