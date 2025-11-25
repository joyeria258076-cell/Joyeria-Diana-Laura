import { Request, Response } from 'express';
import { MFAService } from '../services/MFAService';
import { pool } from '../config/database';

export const mfaController = {
  /**
   * Iniciar configuración de MFA para un usuario
   */
setupMFA: async (req: Request, res: Response) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'UserId y email son requeridos' 
      });
    }

    console.log(`🔐 Iniciando configuración MFA para usuario: ${userId}, email: ${email}`);
    
    // Generar secreto y códigos de respaldo
    const secret = MFAService.generateSecret(email);
    const backupCodes = MFAService.generateBackupCodes();
    const qrCodeUrl = await MFAService.generateQRCode(secret.otpauth_url!);

    // 🆕 FORMATO CORRECTO para PostgreSQL arrays
    const backupCodesFormatted = `{${backupCodes.map(code => `"${code}"`).join(',')}}`;
    
    console.log(`📦 Backup codes formateados: ${backupCodesFormatted}`);

    // Guardar en BD (sin activar MFA aún)
    await pool.query(
      `UPDATE usuarios SET mfa_secret = $1, mfa_backup_codes = $2 WHERE id = $3`,
      [secret.base32, backupCodesFormatted, userId]
    );

    console.log(`✅ MFA configurado para usuario ${userId}`);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCodeUrl: qrCodeUrl,
        backupCodes,
        otpauthUrl: secret.otpauth_url
      },
      message: 'MFA configurado correctamente. Escanea el QR code con tu app authenticator.'
    });
  } catch (error: any) {
    console.error('❌ Error configurando MFA:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error configurando MFA: ' + error.message 
    });
  }
},

  /**
   * Verificar código MFA y activar la protección
   */
  verifyAndEnableMFA: async (req: Request, res: Response) => {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({ 
          success: false, 
          message: 'UserId y token son requeridos' 
        });
      }

      if (!MFAService.isValidMFACode(token)) {
        return res.status(400).json({ 
          success: false, 
          message: 'El código MFA debe tener 6 dígitos' 
        });
      }

      console.log(`🔐 Verificando MFA para usuario: ${userId}`);

      // Obtener secreto del usuario
      const userResult = await pool.query(
        'SELECT mfa_secret FROM usuarios WHERE id = $1',
        [userId]
      );

      const secret = userResult.rows[0]?.mfa_secret;
      if (!secret) {
        return res.status(400).json({ 
          success: false, 
          message: 'MFA no configurado para este usuario' 
        });
      }

      // Verificar token
      const isValid = MFAService.verifyToken(secret, token);
      if (!isValid) {
        console.log(`❌ Código MFA inválido para usuario: ${userId}`);
        return res.status(400).json({ 
          success: false, 
          message: 'Código MFA inválido' 
        });
      }

      // Activar MFA
      await pool.query(
        'UPDATE usuarios SET mfa_enabled = true WHERE id = $1',
        [userId]
      );

      console.log(`✅ MFA activado para usuario: ${userId}`);

      res.json({ 
        success: true, 
        message: 'MFA activado correctamente' 
      });
    } catch (error: any) {
      console.error('❌ Error activando MFA:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error activando MFA: ' + error.message 
      });
    }
  },

  /**
   * Verificar código MFA durante el login
   */
  verifyLoginMFA: async (req: Request, res: Response) => {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({ 
          success: false, 
          message: 'UserId y token son requeridos' 
        });
      }

      if (!MFAService.isValidMFACode(token)) {
        return res.status(400).json({ 
          success: false, 
          message: 'El código MFA debe tener 6 dígitos' 
        });
      }

      console.log(`🔐 Verificando MFA para login usuario: ${userId}`);

      const userResult = await pool.query(
        'SELECT mfa_secret, mfa_enabled FROM usuarios WHERE id = $1',
        [userId]
      );

      const user = userResult.rows[0];
      
      // Si el usuario no tiene MFA activado, permitir acceso
      if (!user.mfa_enabled) {
        return res.json({ 
          success: true, 
          mfaRequired: false,
          message: 'MFA no requerido para este usuario'
        });
      }

      // Verificar código MFA
      const isValid = MFAService.verifyToken(user.mfa_secret, token);
      if (!isValid) {
        console.log(`❌ Código MFA inválido en login para usuario: ${userId}`);
        return res.status(400).json({ 
          success: false, 
          message: 'Código MFA inválido' 
        });
      }

      console.log(`✅ MFA verificado para login usuario: ${userId}`);

      res.json({ 
        success: true, 
        mfaRequired: true, 
        verified: true,
        message: 'MFA verificado correctamente'
      });
    } catch (error: any) {
      console.error('❌ Error verificando MFA en login:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error verificando MFA: ' + error.message 
      });
    }
  },

  /**
   * Desactivar MFA para un usuario
   */
  disableMFA: async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'UserId es requerido' 
        });
      }

      console.log(`🔐 Desactivando MFA para usuario: ${userId}`);

      await pool.query(
        `UPDATE usuarios SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL 
         WHERE id = $1`,
        [userId]
      );

      console.log(`✅ MFA desactivado para usuario: ${userId}`);

      res.json({ 
        success: true, 
        message: 'MFA desactivado correctamente' 
      });
    } catch (error: any) {
      console.error('❌ Error desactivando MFA:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error desactivando MFA: ' + error.message 
      });
    }
  },

  /**
   * Verificar si un usuario tiene MFA activado
   */
  checkMFAStatus: async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'UserId es requerido' 
        });
      }

      const userResult = await pool.query(
        'SELECT mfa_enabled FROM usuarios WHERE id = $1',
        [userId]
      );

      const user = userResult.rows[0];
      
      res.json({ 
        success: true, 
        data: {
          mfaEnabled: user?.mfa_enabled || false
        }
      });
    } catch (error: any) {
      console.error('❌ Error verificando estado MFA:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error verificando estado MFA: ' + error.message 
      });
    }
  }
};