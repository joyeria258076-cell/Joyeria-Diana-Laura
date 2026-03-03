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
    if (!req.user || !req.user.email) return next();

    // 🕵️ Extraemos el rol. Si no existe en el token, asumimos 'cliente'
    const userRole = (req.user as any).rol || 'cliente';
    const userEmail = req.user.email;

    // ⏱️ Definimos el tiempo según el rol
    let MAX_MINUTES = 1440; // 24 horas para clientes

    if (userRole === 'admin' || userRole === 'trabajador') {
      MAX_MINUTES = 15; // 15 minutos para personal
      console.log(`🛡️ Seguridad: Filtro activo para ${userRole} (${userEmail}) - Límite: 15m`);
    }

    // Verificar inactividad
    const isInactive = await userModel.isUserInactive(userEmail, MAX_MINUTES);
    
    if (isInactive) {
      return res.status(401).json({
        success: false,
        message: 'Sesión expirada por inactividad.',
        expired: true
      });
    }

    await userModel.updateUserActivity(userEmail);
    next();
  } catch (error) {
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