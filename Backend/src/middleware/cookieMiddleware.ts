// Archivo: src/middleware/cookieMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { CookieConfig } from '../config/cookieConfig';

export const cookieAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Intentar obtener token de cookie
    const tokenFromCookie = req.cookies?.auth_token;
    
    if (tokenFromCookie) {
      console.log(`🍪 Token encontrado en cookie (${CookieConfig.isProduction ? 'PROD' : 'DEV'})`);
      
      // Si existe token en cookie y no hay Authorization header, agregarlo
      if (!req.headers.authorization) {
        req.headers.authorization = `Bearer ${tokenFromCookie}`;
        console.log(`🍪 Token de cookie convertido a Authorization header`);
      } else {
        console.log(`🔐 Ya existe Authorization header, manteniendo original`);
      }
    } else {
      console.log(`❌ No hay token en cookies`);
    }
    
    // 🆕 DEBUG: Mostrar información útil
    if (req.headers.origin) {
      console.log(`🌐 Origen: ${req.headers.origin}, Entorno: ${CookieConfig.isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
    }
    
  } catch (error) {
    console.error('❌ Error en cookieAuthMiddleware:', error);
  }
  
  next();
};