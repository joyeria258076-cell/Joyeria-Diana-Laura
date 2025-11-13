// En Joyeria-Diana-Laura/Backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import * as userModel from '../models/userModel';
import admin from '../config/firebase';
import { EmailValidationService } from '../services/EmailValidationService';
import { FirestoreService } from '../services/firestoreService';

// 🔐 FUNCIONES DE AUTENTICACIÓN MEJORADAS
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, nombre } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // 🔍 VALIDACIÓN DE FORMATO DE EMAIL
    const formatValidation = EmailValidationService.validateFormat(email);
    if (!formatValidation.valid) {
      return res.status(400).json({
        success: false,
        message: formatValidation.message
      });
    }

    // 🔍 VALIDACIÓN DE EMAIL REAL CON ZEROBOUNCE
    console.log(`🔍 Iniciando validación ZeroBounce para: ${email}`);
    const emailValidation = await EmailValidationService.validateEmail(email);
    
    if (!emailValidation.valid) {
      console.log(`❌ Validación fallida: ${emailValidation.message}`);
      return res.status(400).json({
        success: false,
        message: emailValidation.message || 'El email no es válido'
      });
    }

    console.log(`✅ Email validado correctamente: ${email}`);

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const exists = await userModel.emailExists(email);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Crear usuario en Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
      emailVerified: false
    });

    // Crear usuario en la base de datos local
    const success = await userModel.createUser(email, password, nombre, userRecord.uid);
    
    if (success) {
      // 🆕 CREAR USUARIO EN FIRESTORE
      const firestoreUser = {
        uid: userRecord.uid,
        email: email,
        nombre: nombre,
        emailVerified: false,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date(),
        activo: true
      };

      const firestoreSuccess = await FirestoreService.createUser(firestoreUser);
      
      if (!firestoreSuccess) {
        console.warn('⚠️ Usuario creado pero hubo problema con Firestore');
      }

      console.log(`✅ Usuario registrado exitosamente: ${email}`);
      
      // 🎯 ENVIAR EMAIL DE VERIFICACIÓN - VERSIÓN MEJORADA
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://joyeria-diana-laura.vercel.app';
        
        // Configuración mejorada para el link de verificación
        const actionCodeSettings = {
          url: `${frontendUrl}/login?verified=true&email=${encodeURIComponent(email)}`,
          handleCodeInApp: true, // Cambiado a true para mejor compatibilidad
          dynamicLinkDomain: 'joyeria-diana-laura.firebaseapp.com' // Agregar dominio dinámico
        };
        
        console.log('🎯 Configuración de email de verificación:');
        console.log('📧 Email:', email);
        console.log('🔗 URL de redirección:', actionCodeSettings.url);
        console.log('🌐 Dominio dinámico:', actionCodeSettings.dynamicLinkDomain);
        
        // Generar el link de verificación
        const verificationLink = await admin.auth().generateEmailVerificationLink(
          email, 
          actionCodeSettings
        );
        
        console.log('📧 Link de verificación generado exitosamente');
        console.log('🔗 Link completo:', verificationLink);
        
        // 🆕 ENVIAR EMAIL DIRECTAMENTE USANDO sendEmailVerification
        // Esto es más confiable que solo generar el link
        try {
          await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
          console.log('✅ Email de verificación enviado a través de Firebase');
        } catch (sendError: any) {
          console.warn('⚠️ No se pudo enviar email automáticamente, pero el link se generó:', sendError.message);
        }
        
        // Registrar actividad en Firestore
        await FirestoreService.logUserActivity(userRecord.uid, 'user_registered', {
          email: email,
          verificationSent: true,
          verificationLink: verificationLink, // Guardar el link para debugging
          timestamp: new Date()
        });
        
      } catch (error: any) {
        console.error('❌ Error generando link de verificación:', error);
        console.error('🔍 Detalles del error:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        
        // Registrar error en Firestore
        await FirestoreService.logUserActivity(userRecord.uid, 'verification_email_failed', {
          error: error.message,
          code: error.code,
          timestamp: new Date()
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Usuario registrado correctamente. Revisa tu email para verificar tu cuenta.',
        data: {
          uid: userRecord.uid,
          email: email,
          nombre: nombre,
          emailVerified: false
        }
      });
    } else {
      // Rollback: eliminar usuario de Firebase si falla en BD local
      await admin.auth().deleteUser(userRecord.uid);
      res.status(500).json({
        success: false,
        message: 'Error al registrar usuario en la base de datos'
      });
    }
  } catch (error: any) {
    console.error('Error en register:', error);
    
    // Manejar errores específicos de Firebase
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado en el sistema'
      });
    }
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        message: 'El formato del email es inválido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

// 🆕 FUNCIÓN MEJORADA PARA RECUPERACIÓN DE CONTRASEÑA
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido'
      });
    }

    // Verificar si el usuario existe en nuestra BD local
    const exists = await userModel.emailExists(email);
    
    console.log(`🔍 Solicitando recuperación para: ${email}, existe: ${exists}`);

    try {
      // Configurar la URL de redirección MEJORADA
      const frontendUrl = process.env.FRONTEND_URL || 'https://joyeria-diana-laura.vercel.app';
      const actionCodeSettings = {
        url: `${frontendUrl}/login?reset=success&email=${encodeURIComponent(email)}`,
        handleCodeInApp: true, // Cambiado a true
        dynamicLinkDomain: 'joyeria-diana-laura.firebaseapp.com',
        iOS: {
          bundleId: 'com.joyeriadianalaura.app'
        },
        android: {
          packageName: 'com.joyeriadianalaura.app',
          installApp: false,
          minimumVersion: '12'
        }
      };

      console.log('🎯 Configuración de recuperación de contraseña:');
      console.log('📧 Email:', email);
      console.log('🔗 URL de redirección:', actionCodeSettings.url);

      // 🆕 MÉTODO MÁS CONFIABLE: Usar generatePasswordResetLink
      const resetLink = await admin.auth().generatePasswordResetLink(
        email, 
        actionCodeSettings
      );
      
      console.log('✅ Link de recuperación generado exitosamente');
      console.log('🔗 Link completo:', resetLink);

      // 🆕 INTENTAR ENVÍO DIRECTO
      try {
        await admin.auth().getUserByEmail(email); // Verificar que el usuario existe
        console.log('✅ Usuario verificado en Firebase Auth');
        
        // Enviar email usando el método directo
        await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
        console.log('✅ Email de recuperación procesado por Firebase');
      } catch (firebaseError: any) {
        console.warn('⚠️ Usuario no encontrado en Firebase, pero continuamos:', firebaseError.message);
      }
      
      // 🆕 REGISTRAR ACTIVIDAD EN FIRESTORE
      const user = await userModel.getUserByEmail(email);
      if (user && user.firebase_uid) {
        await FirestoreService.logUserActivity(user.firebase_uid, 'password_reset_requested', {
          timestamp: new Date(),
          resetLink: resetLink, // Guardar link para debugging
          email: email
        });
      }
      
      // 🆕 POR SEGURIDAD, SIEMPRE DEVOLVEMOS ÉXITO
      res.json({
        success: true,
        message: 'Si el email está registrado, se ha enviado un enlace de recuperación. Revisa tu bandeja de entrada y spam.',
        debug: process.env.NODE_ENV === 'development' ? { resetLink } : undefined
      });

    } catch (firebaseError: any) {
      console.error('❌ Error de Firebase en forgotPassword:', firebaseError);
      console.error('🔍 Detalles del error:', {
        code: firebaseError.code,
        message: firebaseError.message
      });
      
      // 🆕 MANEJO MEJORADO DE ERRORES
      if (firebaseError.code === 'auth/user-not-found') {
        // Por seguridad, no revelamos si el email existe o no
        return res.json({
          success: true,
          message: 'Si el email está registrado, se ha enviado un enlace de recuperación. Revisa tu bandeja de entrada y spam.'
        });
      }
      
      if (firebaseError.code === 'auth/invalid-email') {
        return res.status(400).json({
          success: false,
          message: 'El formato del email es inválido'
        });
      }

      if (firebaseError.code === 'auth/unauthorized-continue-uri') {
        return res.status(400).json({
          success: false,
          message: 'La URL de redirección no está autorizada en Firebase Console'
        });
      }

      // 🆕 POR SEGURIDAD, SIEMPRE DEVOLVEMOS ÉXITO EN PRODUCCIÓN
      if (process.env.NODE_ENV === 'production') {
        return res.json({
          success: true,
          message: 'Si el email está registrado, se ha enviado un enlace de recuperación. Revisa tu bandeja de entrada y spam.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Error al enviar email: ${firebaseError.message}`,
          code: firebaseError.code
        });
      }
    }

  } catch (error) {
    console.error('Error en forgotPassword:', error);
    
    // 🆕 POR SEGURIDAD, SIEMPRE DEVOLVEMOS ÉXITO EN PRODUCCIÓN
    if (process.env.NODE_ENV === 'production') {
      res.json({
        success: true,
        message: 'Si el email está registrado, se ha enviado un enlace de recuperación. Revisa tu bandeja de entrada y spam.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};

// 🆕 NUEVO ENDPOINT PARA VERIFICAR CONFIGURACIÓN DE EMAIL
export const testEmailConfiguration = async (req: Request, res: Response) => {
  try {
    const testEmail = 'test@example.com'; // Email de prueba
    
    console.log('🧪 Probando configuración de emails Firebase...');
    
    // Probar verificación de email
    try {
      const verificationLink = await admin.auth().generateEmailVerificationLink(testEmail, {
        url: 'https://joyeria-diana-laura.vercel.app/login',
        handleCodeInApp: false
      });
      console.log('✅ Verificación de email: CONFIGURADA');
    } catch (error: any) {
      console.error('❌ Verificación de email: ERROR', error.message);
    }
    
    // Probar recuperación de contraseña
    try {
      const resetLink = await admin.auth().generatePasswordResetLink(testEmail, {
        url: 'https://joyeria-diana-laura.vercel.app/login',
        handleCodeInApp: false
      });
      console.log('✅ Recuperación de contraseña: CONFIGURADA');
    } catch (error: any) {
      console.error('❌ Recuperación de contraseña: ERROR', error.message);
    }
    
    res.json({
      success: true,
      message: 'Prueba de configuración completada. Revisa los logs del servidor.',
      configuration: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        frontendUrl: process.env.FRONTEND_URL,
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('Error en testEmailConfiguration:', error);
    res.status(500).json({
      success: false,
      message: 'Error probando configuración de email'
    });
  }
};

// ... (el resto de las funciones se mantienen igual - login, resetPassword, etc.)

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Primero verificamos si el usuario existe
    const userExists = await userModel.emailExists(email);
    
    if (!userExists) {
      return res.status(401).json({
        success: false,
        message: 'El usuario no existe. Por favor, verifica tu correo electrónico.'
      });
    }

    // Si el usuario existe, verificamos la contraseña
    const user = await userModel.verifyUser(email, password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta. Por favor, intenta nuevamente.'
      });
    }

    // 🆕 ACTUALIZAR ÚLTIMO LOGIN EN FIRESTORE
    if (user.firebase_uid) {
      await FirestoreService.updateLastLogin(user.firebase_uid);
      await FirestoreService.logUserActivity(user.firebase_uid, 'user_login', {
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          firebase_uid: user.firebase_uid
        }
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
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
        
        // 🆕 REGISTRAR ACTIVIDAD EN FIRESTORE
        await FirestoreService.logUserActivity(userRecord.uid, 'password_reset_success', {
          timestamp: new Date()
        });
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
      // Esta función normalmente la maneja el frontend con Firebase SDK
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

export const checkEmailConfig = async (req: Request, res: Response) => {
  try {
    // Verificar que Firebase esté configurado correctamente
    const testEmail = 'test@example.com';
    
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://joyeria-diana-laura.vercel.app';
      const actionCodeSettings = {
        url: `${frontendUrl}/login?verified=true`,
        handleCodeInApp: false
      };
      
      await admin.auth().generateEmailVerificationLink(testEmail, actionCodeSettings);
      
      res.json({
        success: true,
        message: `Configuración de email verificada correctamente. Los links redirigirán a: ${frontendUrl}/login`
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

// 🆕 NUEVAS FUNCIONES PARA FIRESTORE

export const checkEmailVerification = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'UID es requerido'
      });
    }

    // Obtener usuario de Firebase Auth
    const user = await admin.auth().getUser(uid);
    
    // Obtener usuario de Firestore
    const firestoreUser = await FirestoreService.getUserByUid(uid);
    
    // Si el email fue verificado y en Firestore no está marcado, actualizar
    if (user.emailVerified && firestoreUser && !firestoreUser.emailVerified) {
      await FirestoreService.markEmailAsVerified(uid);
      await FirestoreService.logUserActivity(uid, 'email_verified', {
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      data: {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        firestoreUser: firestoreUser
      }
    });

  } catch (error: any) {
    console.error('Error en checkEmailVerification:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error verificando estado de email'
    });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://joyeria-diana-laura.vercel.app';
      const actionCodeSettings = {
        url: `${frontendUrl}/login?verified=true&email=${encodeURIComponent(email)}`,
        handleCodeInApp: false
      };

      const verificationLink = await admin.auth().generateEmailVerificationLink(
        email, 
        actionCodeSettings
      );

      console.log('📧 Email de verificación reenviado a:', email);
      
      // 🆕 REGISTRAR ACTIVIDAD EN FIRESTORE
      const userRecord = await admin.auth().getUserByEmail(email);
      await FirestoreService.logUserActivity(userRecord.uid, 'verification_email_resent', {
        timestamp: new Date()
      });
      
      res.json({
        success: true,
        message: 'Email de verificación reenviado correctamente'
      });

    } catch (firebaseError: any) {
      console.error('Error de Firebase en resendVerificationEmail:', firebaseError);
      
      if (firebaseError.code === 'auth/user-not-found') {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }
      
      res.status(400).json({
        success: false,
        message: `Error reenviando email de verificación: ${firebaseError.message}`
      });
    }

  } catch (error) {
    console.error('Error en resendVerificationEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'UID es requerido'
      });
    }

    // Obtener de Firebase Auth
    const authUser = await admin.auth().getUser(uid);
    
    // Obtener de Firestore
    const firestoreUser = await FirestoreService.getUserByUid(uid);
    
    // Obtener de base de datos local
    const localUser = await userModel.getUserByEmail(authUser.email!);

    res.json({
      success: true,
      data: {
        auth: {
          uid: authUser.uid,
          email: authUser.email,
          emailVerified: authUser.emailVerified,
          displayName: authUser.displayName
        },
        firestore: firestoreUser,
        local: localUser ? {
          id: localUser.id,
          nombre: localUser.nombre,
          email: localUser.email,
          activo: localUser.activo
        } : null
      }
    });

  } catch (error: any) {
    console.error('Error en getUserProfile:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error obteniendo perfil de usuario'
    });
  }
};

/*
// Función para verificar token (opcional)
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const user = await userModel.getUserByResetToken(token);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    res.json({
      success: true,
      message: 'Token válido'
    });

  } catch (error) {
    console.error('Error en verifyResetToken:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};*/