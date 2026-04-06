// Ruta: Joyeria-Diana-Laura/Backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SessionService } from '../services/SessionService';
import { JWTService } from '../services/JWTService';
import { pool } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_2024_joyeria_diana_laura';

export interface AuthRequest extends Request {
  user?: any;
  sessionId?: string;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // 🎯 VERIFICACIÓN MÁS FLEXIBLE: También aceptar sessionToken en header
  const sessionToken = req.headers['x-session-token'] as string;

  if (!token && !sessionToken) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  try {
    // 🎯 ESTRATEGIA DUAL: Intentar con JWT primero, luego con sessionToken
    let decoded: any;
    let sessionIdToVerify: string = '';

    if (token) {
      console.log('🔐 Verificando token JWT seguro...');
      
      // 🎯 VERIFICACIÓN JWT MEJORADA
      decoded = JWTService.verifyToken(token);
      
      if (!decoded.sessionId) {
        console.error('❌ Token JWT inválido: falta sessionId');
        return res.status(403).json({
          success: false,
          message: 'Token inválido: falta sessionId'
        });
      }
      sessionIdToVerify = decoded.sessionId;
      console.log(`✅ JWT válido para usuario: ${decoded.email}, sessionId: ${sessionIdToVerify.substring(0, 10)}...`);
    } else if (sessionToken) {
      console.log('🔐 Verificando sessionToken directo...');
      // Si solo viene sessionToken, buscar la sesión para obtener datos del usuario
      const sessionResult = await SessionService.getSessionByToken(sessionToken);
      if (!sessionResult.success || !sessionResult.session) {
        return res.status(403).json({
          success: false,
          message: 'SessionToken inválido'
        });
      }
      
      // Crear objeto decoded básico con información de la sesión
      decoded = {
        userId: sessionResult.session.user_id,
        sessionId: sessionToken,
        email: 'user@example.com' // Placeholder, podrías obtener el email de la BD si es necesario
      };
      sessionIdToVerify = sessionToken;
      console.log(`✅ SessionToken válido para usuario ID: ${decoded.userId}`);
    } else {
      return res.status(401).json({
        success: false,
        message: 'Formato de autenticación no válido'
      });
    }

    // 🎯 VERIFICAR QUE sessionIdToVerify ESTÉ ASIGNADA
    if (!sessionIdToVerify) {
      return res.status(401).json({
        success: false,
        message: 'Error en autenticación: sessionId no disponible'
      });
    }

    // 🎯 VERIFICACIÓN OBLIGATORIA DE SESIÓN ACTIVA EN BD
    console.log('🔍 Verificando sesión en base de datos...');
    const sessionResult = await SessionService.getSessionByToken(sessionIdToVerify);
    
    if (!sessionResult.success || !sessionResult.session) {
      console.error('❌ Sesión no encontrada en BD:', sessionIdToVerify);
      return res.status(403).json({
        success: false,
        message: 'Sesión revocada o expirada'
      });
    }

    // Verificar si la sesión está revocada o expirada
    const session = sessionResult.session;
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (session.is_revoked) {
      console.error('❌ Sesión revocada:', sessionIdToVerify);
      return res.status(403).json({
        success: false,
        message: 'Sesión revocada'
      });
    }

    if (expiresAt < now) {
      console.error('❌ Sesión expirada:', sessionIdToVerify);
      // Marcar como revocada automáticamente
      await SessionService.revokeSessionByToken(sessionIdToVerify);
      return res.status(403).json({
        success: false,
        message: 'Sesión expirada'
      });
    }

    // 🎯 Actualizar última actividad
    console.log('🔄 Actualizando última actividad de la sesión...');
    await SessionService.updateLastActivity(sessionIdToVerify);

    // Agregar información al request
    req.user = decoded;
    req.sessionId = sessionIdToVerify;
    
    console.log(`✅ Autenticación segura exitosa para sesión: ${sessionIdToVerify.substring(0, 10)}...`);
    next();

  } catch (error: any) {
    console.error('❌ Error en autenticación segura:', error);
    
    // 🎯 MANEJO MEJORADO DE ERRORES JWT
    if (error.message.includes('SESSION_EXPIRED')) {
      return res.status(403).json({
        success: false,
        message: 'Sesión expirada',
        expired: true
      });
    }
    
    if (error.message.includes('INVALID_TOKEN')) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    console.error('❌ Error interno del servidor en middleware:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor en autenticación'
    });
  }
};

// 🎯 MIDDLEWARE PARA OBTENER INFORMACIÓN DEL TOKEN SIN VERIFICAR (solo debugging)
export const getTokenInfo = async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token requerido'
    });
  }

  try {
    const tokenInfo = JWTService.getTokenInfo(token);
    const decoded = JWTService.decodeToken(token);

    res.json({
      success: true,
      data: {
        tokenInfo,
        decoded: decoded ? {
          userId: decoded.userId,
          email: decoded.email,
          sessionId: decoded.sessionId ? `${decoded.sessionId.substring(0, 10)}...` : null
        } : null
      }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// 🆕 Middleware opcional para rutas que pueden ser públicas/privadas
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const sessionToken = req.headers['x-session-token'] as string;

  if (!token && !sessionToken) {
    return next();
  }

  try {
    let decoded: any = null;
    let sessionIdToVerify: string | null = null; // 🆕 INICIALIZAR COMO NULL

    if (token) {
      decoded = jwt.verify(token, JWT_SECRET) as any;
      sessionIdToVerify = decoded.sessionId;
    } else if (sessionToken) {
      // Verificar sessionToken directo
      const sessionResult = await SessionService.getSessionByToken(sessionToken);
      if (sessionResult.success && sessionResult.session) {
        decoded = {
          userId: sessionResult.session.user_id,
          sessionId: sessionToken
        };
        sessionIdToVerify = sessionToken;
      }
    }

    if (decoded && sessionIdToVerify) {
      const sessionResult = await SessionService.getSessionByToken(sessionIdToVerify);
      
      if (sessionResult.success && sessionResult.session && 
          !sessionResult.session.is_revoked && 
          new Date(sessionResult.session.expires_at) > new Date()) {
        
        // Actualizar actividad y establecer datos de usuario
        await SessionService.updateLastActivity(sessionIdToVerify);
        req.user = decoded;
        req.sessionId = sessionIdToVerify;
        
        console.log(`✅ Autenticación opcional exitosa`);
      }
    }
    
    next();
  } catch (error) {
    // Si hay error, continuamos sin autenticación (ruta opcional)
    console.log('⚠️ Error en autenticación opcional - continuando sin autenticación');
    next();
  }
};

// 🆕 Middleware SIMPLIFICADO para verificación básica de sesión
export const verifySession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const sessionToken = req.headers['x-session-token'] as string;

  if (!sessionToken) {
    return res.status(401).json({
      success: false,
      message: 'Session token requerido'
    });
  }

  try {
    const sessionResult = await SessionService.getSessionByToken(sessionToken);
    
    if (!sessionResult.success || !sessionResult.session) {
      return res.status(403).json({
        success: false,
        message: 'Sesión no válida'
      });
    }

    const session = sessionResult.session;
    
    // Verificaciones básicas
    if (session.is_revoked) {
      return res.status(403).json({
        success: false,
        message: 'Sesión revocada'
      });
    }

    if (new Date(session.expires_at) < new Date()) {
      await SessionService.revokeSessionByToken(sessionToken);
      return res.status(403).json({
        success: false,
        message: 'Sesión expirada'
      });
    }

    // Actualizar actividad
    await SessionService.updateLastActivity(sessionToken);
    
    // Agregar información básica al request
    req.user = { userId: session.user_id };
    req.sessionId = sessionToken;
    
    next();
  } catch (error: any) {
    console.error('❌ Error verificando sesión:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verificando sesión'
    });
  }
};

// 🆕 Middleware para rutas que NO requieren autenticación estricta
export const softAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const sessionToken = req.headers['x-session-token'] as string;

  if (!sessionToken) {
    return next(); // Continuar sin autenticación
  }

  try {
    const sessionResult = await SessionService.getSessionByToken(sessionToken);
    
    if (sessionResult.success && sessionResult.session && 
        !sessionResult.session.is_revoked && 
        new Date(sessionResult.session.expires_at) > new Date()) {
      
      // Sesión válida - actualizar actividad y establecer datos
      await SessionService.updateLastActivity(sessionToken);
      req.user = { userId: sessionResult.session.user_id };
      req.sessionId = sessionToken;
    }
    
    next();
  } catch (error) {
    // En caso de error, continuar sin autenticación
    console.log('⚠️ Error en softAuth - continuando sin autenticación');
    next();
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // 1. Obtenemos el ID del usuario que authenticateToken ya validó
        const userId = (req as any).user?.userId || (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Usuario no identificado.' });
        }

        // 2. Consultamos el rol en la BD (Usando tu pool existente)
        const result = await pool.query('SELECT rol FROM seguridad.usuarios WHERE id = $1', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const rol = result.rows[0].rol;

        // 3. Verificamos si es admin o trabajador
        if (rol !== 'admin' && rol !== 'trabajador') {
            return res.status(403).json({ 
                success: false, 
                message: 'Acceso denegado. Se requieren permisos de Administrador.' 
            });
        }

        // 4. Si es admin, dejamos pasar
        next();

    } catch (error) {
        console.error('Error validando rol de admin:', error);
        return res.status(500).json({ success: false, message: 'Error del servidor al validar permisos.' });
    }
};
