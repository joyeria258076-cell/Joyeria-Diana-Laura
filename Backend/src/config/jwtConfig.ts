// Ruta: Backend/src/config/jwtConfig.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class JWTConfig {
  private static readonly ALGORITHM = 'HS256';
  private static readonly EXPIRES_IN = '30d';
  
  // 🎯 GENERAR SECRET SEGURO (mejor que usar string simple)
  private static generateSecret(): string {
    const secretFromEnv = process.env.JWT_SECRET;
    
    if (!secretFromEnv || secretFromEnv === 'fallback_secret_2024_joyeria_diana_laura') {
      console.warn('⚠️  JWT_SECRET no configurado, generando uno automáticamente');
      // Generar secret seguro de 64 bytes
      return crypto.randomBytes(64).toString('hex');
    }
    
    // Validar que el secret tenga longitud mínima segura
    if (secretFromEnv.length < 32) {
      console.warn('⚠️  JWT_SECRET muy corto, usando versión extendida');
      return crypto.createHash('sha256').update(secretFromEnv).digest('hex');
    }
    
    return secretFromEnv;
  }

  // 🎯 SECRET SEGURO
  public static getSecret(): string {
    return this.generateSecret();
  }

  // 🎯 OPCIONES DE FIRMA SEGURAS
  public static getSignOptions(): jwt.SignOptions {
    return {
      algorithm: this.ALGORITHM as jwt.Algorithm,
      expiresIn: this.EXPIRES_IN,
      issuer: 'joyeria-diana-laura-backend',
      audience: 'joyeria-diana-laura-frontend'
    };
  }

  // 🎯 OPCIONES DE VERIFICACIÓN SEGURAS
  public static getVerifyOptions(): jwt.VerifyOptions {
    return {
      algorithms: [this.ALGORITHM as jwt.Algorithm],
      issuer: 'joyeria-diana-laura-backend',
      audience: 'joyeria-diana-laura-frontend',
      ignoreExpiration: false // 🚫 NO ignorar expiración
    };
  }

  // 🎯 VERIFICAR CONFIGURACIÓN AL INICIAR
  public static validateConfig(): void {
    const secret = this.getSecret();
    
    if (secret === 'fallback_secret_2024_joyeria_diana_laura' || secret.length < 32) {
      console.error('❌ CONFIGURACIÓN JWT INSECURA DETECTADA');
      console.log('🔐 Recomendación: Establece JWT_SECRET en .env con al menos 32 caracteres');
    } else {
      console.log('✅ Configuración JWT verificada correctamente');
      console.log(`🔐 Algoritmo: ${this.ALGORITHM}, Expiración: ${this.EXPIRES_IN}`);
    }
  }
}

// Validar configuración al cargar el módulo
JWTConfig.validateConfig();