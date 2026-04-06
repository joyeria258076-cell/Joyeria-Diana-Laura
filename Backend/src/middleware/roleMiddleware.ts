// Backend/src/middleware/roleMiddleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { pool, getPoolByRole } from '../config/database';

// Middleware existente para roles de aplicación
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('🔐 [requireAdmin] Verificando rol de administrador...');
  
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const result = await pool.query('SELECT rol FROM seguridad.usuarios WHERE id = $1', [userId]);

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

// Middleware que también cambia el pool según el rol del usuario
export const requireRoleWithDB = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      }

      const result = await pool.query('SELECT rol FROM seguridad.usuarios WHERE id = $1', [userId]);
      const userRole = result.rows[0]?.rol;

      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado. Roles permitidos: ${allowedRoles.join(', ')}`
        });
      }

      // Asignar pool de base de datos según el rol
      (req as any).dbPool = getPoolByRole(userRole);
      (req as any).userRole = userRole;

      next();
    } catch (error) {
      console.error('❌ [requireRoleWithDB] Error:', error);
      return res.status(500).json({ success: false, message: 'Error del servidor' });
    }
  };
};

// Middleware para workers (trabajadores)
export const requireWorker = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const result = await pool.query('SELECT rol FROM seguridad.usuarios WHERE id = $1', [userId]);
    const rol = result.rows[0]?.rol;

    if (rol !== 'admin' && rol !== 'trabajador') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de Administrador o Trabajador'
      });
    }

    next();
  } catch (error) {
    console.error('❌ [requireWorker] Error:', error);
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

// Middleware para clientes
export const requireCliente = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    const result = await pool.query('SELECT rol FROM seguridad.usuarios WHERE id = $1', [userId]);
    const rol = result.rows[0]?.rol;

    if (rol !== 'admin' && rol !== 'trabajador' && rol !== 'cliente') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de Cliente'
      });
    }

    next();
  } catch (error) {
    console.error('❌ [requireCliente] Error:', error);
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

// Middleware genérico
export const requireRol = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      }

      const result = await pool.query('SELECT rol FROM seguridad.usuarios WHERE id = $1', [userId]);
      const userRole = result.rows[0]?.rol;

      if (!userRole || !roles.includes(userRole)) {
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