// Backend/src/middleware/roleMiddleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { pool } from '../config/database';

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('🔐 [requireAdmin] Verificando rol de administrador...');
  
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;

    if (!userId) {
      console.log('❌ [requireAdmin] No hay ID de usuario en la request');
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const result = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const rol = result.rows[0].rol;

    if (rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de Administrador'
      });
    }

    console.log('✅ [requireAdmin] Acceso concedido a administrador');
    next();

  } catch (error) {
    console.error('❌ [requireAdmin] Error:', error);
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

export const requireRol = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      }

      const result = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId]);
      const userRole = result.rows[0].rol;
      const normalizedRoles = roles.map(r => r.toLowerCase().trim());

      if (!normalizedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado. Roles permitidos: ${roles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('❌ [requireRol] Error:', error);
      return res.status(500).json({ success: false, message: 'Error del servidor' });
    }
  };
};