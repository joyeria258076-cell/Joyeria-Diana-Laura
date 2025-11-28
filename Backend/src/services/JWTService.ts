import jwt from 'jsonwebtoken';
import { JWTConfig } from '../config/jwtConfig';

export interface JWTPayload {
  userId: number;
  firebaseUid: string;
  email: string;
  nombre: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export class JWTService {
  /**
   * 🎯 GENERAR TOKEN JWT SEGURO
   */
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      const token = jwt.sign(
        payload,
        JWTConfig.getSecret(),
        JWTConfig.getSignOptions()
      );

      console.log(`✅ JWT generado para usuario: ${payload.email}`);
      console.log(`🔐 SessionId en JWT: ${payload.sessionId.substring(0, 10)}...`);
      
      return token;
    } catch (error) {
      console.error('❌ Error generando JWT:', error);
      throw new Error('No se pudo generar el token de autenticación');
    }
  }

  /**
   * 🎯 VERIFICAR TOKEN JWT DE FORMA SEGURA
   */
  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(
        token, 
        JWTConfig.getSecret(), 
        JWTConfig.getVerifyOptions()
      ) as JWTPayload;

      // 🎯 VALIDACIONES ADICIONALES
      this.validateTokenPayload(decoded);
      
      console.log(`✅ JWT verificado para usuario: ${decoded.email}`);
      return decoded;
    } catch (error: any) {
      console.error('❌ Error verificando JWT:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        throw new Error('SESSION_EXPIRED: El token ha expirado');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('INVALID_TOKEN: Token inválido');
      }
      if (error.name === 'NotBeforeError') {
        throw new Error('TOKEN_NOT_ACTIVE: Token no activo');
      }
      
      throw new Error('INVALID_SESSION: Sesión inválida');
    }
  }

  /**
   * 🎯 VALIDAR ESTRUCTURA DEL PAYLOAD
   */
  private static validateTokenPayload(payload: any): asserts payload is JWTPayload {
    const requiredFields = ['userId', 'firebaseUid', 'email', 'nombre', 'sessionId'];
    
    for (const field of requiredFields) {
      if (!payload[field]) {
        throw new Error(`INVALID_PAYLOAD: Campo ${field} faltante en JWT`);
      }
    }

    // Validar tipos de datos
    if (typeof payload.userId !== 'number') {
      throw new Error('INVALID_PAYLOAD: userId debe ser número');
    }
    if (typeof payload.sessionId !== 'string' || payload.sessionId.length < 10) {
      throw new Error('INVALID_PAYLOAD: sessionId inválido');
    }
  }

  /**
   * 🎯 DECODIFICAR TOKEN SIN VERIFICAR (solo para debugging)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      console.error('❌ Error decodificando JWT:', error);
      return null;
    }
  }

  /**
   * 🎯 OBTENER INFORMACIÓN DEL TOKEN (expiración, etc)
   */
  static getTokenInfo(token: string): { expiresAt: Date; issuedAt: Date; isValid: boolean } {
    try {
      const decoded = this.verifyToken(token);
      
      return {
        expiresAt: new Date((decoded.exp || 0) * 1000),
        issuedAt: new Date((decoded.iat || 0) * 1000),
        isValid: true
      };
    } catch (error) {
      return {
        expiresAt: new Date(),
        issuedAt: new Date(),
        isValid: false
      };
    }
  }
}