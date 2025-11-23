// Backend/src/middleware/activityMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import * as userModel from '../models/userModel';

export interface ActivityRequest extends Request {
  user?: {
    email: string;
    id?: string;
  };
}

/**
 * Middleware para verificar inactividad del usuario
 * Rechaza requests si el usuario ha estado inactivo por más de 15 minutos
 */
export const checkActivity = async (req: ActivityRequest, res: Response, next: NextFunction) => {
  try {
    // Solo verificar si hay usuario autenticado
    if (!req.user || !req.user.email) {
      return next();
    }

    const MAX_INACTIVITY_MINUTES = 15;
    
    // Verificar si el usuario está inactivo
    const isInactive = await userModel.isUserInactive(req.user.email, MAX_INACTIVITY_MINUTES);
    
    if (isInactive) {
      console.log(`🕒 Sesión expirada por inactividad para: ${req.user.email}`);
      
      return res.status(401).json({
        success: false,
        message: 'Sesión expirada por inactividad. Por favor, inicia sesión nuevamente.',
        expired: true
      });
    }

    // Actualizar timestamp de actividad para requests exitosos
    await userModel.updateUserActivity(req.user.email);
    
    next();
  } catch (error) {
    console.error('Error en checkActivity middleware:', error);
    // En caso de error, permitir que continúe por seguridad
    next();
  }
};

/**
 * Middleware para solo actualizar actividad (sin verificar inactividad)
 * Útil para endpoints que no requieren verificación estricta
 */
export const updateActivityOnly = async (req: ActivityRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user && req.user.email) {
      await userModel.updateUserActivity(req.user.email);
    }
    next();
  } catch (error) {
    console.error('Error en updateActivityOnly:', error);
    next(); // Continuar incluso si hay error
  }
};