import { Request, Response } from 'express';
import * as userModel from '../../models/userModel';
import admin from '../../config/firebase';
import { RecoverySecurityService } from '../../services/recoverySecurityService';
import { validateEmailSecurity } from '../../utils/inputValidation';

// 1. SOLICITAR RECUPERACIÓN (Enviar correo/código)
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validación básica
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email es requerido' 
      });
    }

    // Validación de seguridad del formato
    const emailSecurityCheck = validateEmailSecurity(email);
    if (!emailSecurityCheck.valid) {
      return res.status(400).json({ 
        success: false, 
        message: emailSecurityCheck.message 
      });
    }

    console.log(`📧 Procesando recuperación para: ${email}`);
    
    // Verificar límites de intentos (Seguridad)
    const limitCheck = await RecoverySecurityService.checkRecoveryLimits(email);
    
    if (!limitCheck.allowed) {
      return res.status(429).json({ 
        success: false, 
        message: `Demasiados intentos. Intente en ${limitCheck.remainingTime} min.`,
        blocked: true,
        remainingTime: limitCheck.remainingTime
      });
    }

    // Registrar el intento
    await RecoverySecurityService.incrementRecoveryAttempts(email);
    const updatedLimitCheck = await RecoverySecurityService.checkRecoveryLimits(email);
    
    // AQUÍ IRÍA LA LÓGICA DE ENVÍO DE CORREO REAL
    
    res.json({ 
      success: true, 
      message: 'Si el correo existe, se enviará un código de verificación.',
      remainingAttempts: updatedLimitCheck.remainingAttempts
    });

  } catch (error: any) {
    console.error('❌ Error en forgotPassword:', error);
    res.json({ 
      success: true, 
      message: 'Si el correo existe, se enviará un código de verificación.',
      remainingAttempts: 2 
    });
  }
};

// 2. CAMBIAR CONTRASEÑA (Usando Email y Nueva Contraseña - Modo Completo)
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    
    // Validaciones
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    try {
      // A. Actualizar en Firebase
      console.log('🔐 Actualizando en Firebase...');
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(userRecord.uid, { password: newPassword });
      
      // B. Actualizar en PostgreSQL (si existe)
      console.log('🗄️ Actualizando en PostgreSQL...');
      const user = await userModel.getUserByEmail(email);
      if (user?.id) {
        await userModel.updatePassword(user.id, newPassword);
      }

      // C. Resetear contadores de seguridad
      await RecoverySecurityService.resetAfterSuccessfulRecovery(email);

      res.json({ 
        success: true, 
        message: 'Contraseña actualizada correctamente en ambos sistemas' 
      });

    } catch (firebaseError: any) {
      console.error('❌ Error Firebase:', firebaseError);
      return res.status(400).json({ 
        success: false, 
        message: 'Error al actualizar: ' + firebaseError.message 
      });
    }

  } catch (error: any) {
    console.error('❌ Error general:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno: ' + error.message 
    });
  }
};

// 3. RESETEAR INTENTOS MANUALMENTE
export const resetRecoveryAttempts = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requerido' });
    }
    
    await RecoverySecurityService.resetAfterSuccessfulRecovery(email);
    
    res.json({ 
      success: true, 
      message: 'Contador de intentos reseteado' 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error reseteando intentos' });
  }
};

// 4. RESET PASSWORD SOLO FIREBASE (La que pediste mantener)
export const resetPasswordFirebase = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email y nueva contraseña requeridos' });
    }

    console.log(`🔥 Actualizando solo Firebase para: ${email}`);
    
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });

    res.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente en Firebase' 
    });

  } catch (error: any) {
    console.error('❌ Error en resetPasswordFirebase:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error actualizando Firebase: ' + error.message 
    });
  }
};