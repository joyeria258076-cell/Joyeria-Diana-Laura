// Backend/src/controllers/seguridad/mfaController.ts
import { Request, Response } from 'express';
import { MFAService } from '../../services/MFAService';
import { pool } from '../../config/database';
import { SessionService } from '../../services/SessionService';
import jwt from 'jsonwebtoken'; 
import { JWTService } from '../../services/JWTService';

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
      
      const secret = MFAService.generateSecret(email);
      const backupCodes = MFAService.generateBackupCodes();
      const qrCodeUrl = await MFAService.generateQRCode(secret.otpauth_url!);

      const backupCodesFormatted = `{${backupCodes.map((code: string) => `"${code}"`).join(',')}}`;
      
      console.log(`📦 Backup codes formateados: ${backupCodesFormatted}`);

      // ✅ CORREGIDO: agregar esquema seguridad
      await pool.query(
        `UPDATE seguridad.usuarios SET mfa_secret = $1, mfa_backup_codes = $2 WHERE id = $3`,
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

      // ✅ CORREGIDO: agregar esquema seguridad
      const userResult = await pool.query(
        'SELECT mfa_secret FROM seguridad.usuarios WHERE id = $1',
        [userId]
      );

      const secret = userResult.rows[0]?.mfa_secret;
      if (!secret) {
        return res.status(400).json({ 
          success: false, 
          message: 'MFA no configurado para este usuario' 
        });
      }

      const isValid = MFAService.verifyToken(secret, token);
      if (!isValid) {
        console.log(`❌ Código MFA inválido para usuario: ${userId}`);
        return res.status(400).json({ 
          success: false, 
          message: 'Código MFA inválido' 
        });
      }

      // ✅ CORREGIDO: agregar esquema seguridad
      await pool.query(
        'UPDATE seguridad.usuarios SET mfa_enabled = true WHERE id = $1',
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

      // ✅ CORREGIDO: agregar esquema seguridad
      const userResult = await pool.query(
        `SELECT u.id, u.email, u.nombre, u.mfa_secret, u.mfa_enabled, u.firebase_uid 
         FROM seguridad.usuarios u 
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuario no encontrado' 
        });
      }

      const user = userResult.rows[0];
      
      if (!user.mfa_enabled) {
        console.log(`⚠️ MFA no activado para usuario: ${userId}`);
        return res.json({ 
          success: true, 
          mfaRequired: false,
          message: 'MFA no requerido para este usuario'
        });
      }

      const isValid = MFAService.verifyToken(user.mfa_secret, token);
      if (!isValid) {
        console.log(`❌ Código MFA inválido en login para usuario: ${userId}`);
        return res.status(400).json({ 
          success: false, 
          message: 'Código MFA inválido' 
        });
      }

      console.log(`✅ MFA verificado para login usuario: ${userId}`);

      try {
        const clientIp = req.headers['x-forwarded-for'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        'unknown';
        
        const userAgent = req.get('User-Agent') || 'unknown';
        const deviceInfo = SessionService.parseUserAgent(userAgent);
        
        console.log(`🔄 Creando sesión para usuario después de MFA: ${userId}`);
        
        const sessionResult = await SessionService.createSession(
          userId,
          user.firebase_uid,
          deviceInfo,
          clientIp as string,
          userAgent
        );

        if (sessionResult.success && sessionResult.sessionToken) {
          const jwtToken = JWTService.generateToken({
            userId: userId,
            firebaseUid: user.firebase_uid,
            email: user.email,
            nombre: user.nombre,
            sessionId: sessionResult.sessionToken
          });

          console.log(`✅ Sesión y JWT seguro creados después de MFA para: ${user.email}`);

          return res.json({ 
            success: true, 
            mfaRequired: true, 
            verified: true,
            message: 'MFA verificado correctamente',
            data: {
              user: {
                id: user.firebase_uid,
                email: user.email,
                nombre: user.nombre,
                dbId: userId
              },
              token: jwtToken,
              sessionToken: sessionResult.sessionToken
            }
          });
        } else {
          console.error('❌ Error creando sesión después de MFA:', sessionResult.error);
          throw new Error('No se pudo crear la sesión');
        }
      } catch (sessionError: any) {
        console.error('❌ Error en proceso de sesión después de MFA:', sessionError);
        throw new Error('Error completando el login después de MFA');
      }

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

      // ✅ CORREGIDO: agregar esquema seguridad
      await pool.query(
        `UPDATE seguridad.usuarios SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL 
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

      // ✅ CORREGIDO: agregar esquema seguridad
      const userResult = await pool.query(
        'SELECT mfa_enabled FROM seguridad.usuarios WHERE id = $1',
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