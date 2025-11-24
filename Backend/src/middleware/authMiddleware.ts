// Ruta: Joyeria-Diana-Laura/Backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SessionService } from '../services/SessionService';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_fallback';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  // 🆕 VERIFICAR SI EXISTE SESSION_TOKEN EN HEADER (OPCIONAL)
  const sessionToken = req.headers['x-session-token'] as string;

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // 🆕 VERIFICACIÓN OPCIONAL DE SESIÓN ACTIVA
    if (sessionToken) {
      try {
        const sessionResult = await SessionService.getSessionByToken(sessionToken);
        if (!sessionResult.success) {
          return res.status(403).json({
            success: false,
            message: 'Sesión revocada o expirada'
          });
        }
        
        // Actualizar última actividad
        await SessionService.updateLastActivity(sessionToken);
      } catch (sessionError) {
        console.error('Error verificando sesión:', sessionError);
        // NO BLOQUEAMOS - solo log del error
      }
    }

    req.user = user;
    next();
  });
};