// Ruta: Joyeria-Diana-Laura/Backend/src/services/loginSecurityService.ts
import { pool } from '../config/database';

export interface LoginAttempt {
  id?: number;
  email: string;
  ip_address: string;
  user_agent?: string;
  attempt_time?: Date;
  success: boolean;
  failure_reason?: string;
}

export class LoginSecurityService {
  // 🎯 MISMOS PARÁMETROS QUE RECUPERACIÓN: 3 intentos, 2 minutos
  public static readonly MAX_ATTEMPTS = 3;
  public static readonly LOCK_DURATION_MINUTES = 15;

  /**
   * Las columnas son TIMESTAMP sin zona y guardan hora UTC; el driver las entrega
   * como texto ("2026-09-26 21:42:44"). Sin la "Z", el navegador las leía como hora
   * local y el aviso mostraba 6 horas de más.
   */
  static aFechaUTC(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    const t = String(v).trim().replace(' ', 'T');
    return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(t) ? t : `${t}Z`);
  }

  /**
   * Obtener duración del bloqueo
   */
  static getLockDurationMinutes(): number {
    return this.LOCK_DURATION_MINUTES;
  }

  /**
   * Obtener máximo de intentos
   */
  static getMaxAttempts(): number {
    return this.MAX_ATTEMPTS;
  }

  /**
   * Registrar intento de login (solo para auditoría)
   */
  static async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason) 
         VALUES ($1, $2, $3, $4, $5)`,
        [attempt.email, attempt.ip_address, attempt.user_agent, attempt.success, attempt.failure_reason]
      );
    } catch (error) {
      console.error('❌ Error registrando intento de login:', error);
    }
  }

  /**
   * Verificar si la cuenta está bloqueada - NUEVO ENFOQUE
   */
  static async isAccountLocked(email: string): Promise<{ 
    locked: boolean; 
    lockedUntil?: string; 
    remainingMinutes?: number;
    attempts?: number;
    remainingAttempts?: number;
  }> {
    try {
      // Buscar en la tabla login_security
      const result = await pool.query(
        `SELECT login_attempts, login_blocked_until 
         FROM login_security 
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return { 
          locked: false, 
          attempts: 0,
          remainingAttempts: this.MAX_ATTEMPTS 
        };
      }

      const security = result.rows[0];
      const now = new Date();

      // Verificar si está bloqueado
      const bloqueadoHasta = this.aFechaUTC(security.login_blocked_until);
      if (bloqueadoHasta && bloqueadoHasta > now) {
        const remainingTime = Math.ceil((bloqueadoHasta.getTime() - now.getTime()) / 60000);
        
        return {
          locked: true,
          lockedUntil: bloqueadoHasta.toISOString(),
          remainingMinutes: remainingTime,
          attempts: security.login_attempts,
          remainingAttempts: 0
        };
      }

      // Si no está bloqueado, calcular intentos restantes
      const remainingAttempts = Math.max(0, this.MAX_ATTEMPTS - security.login_attempts);
      
      return { 
        locked: false, 
        attempts: security.login_attempts,
        remainingAttempts: remainingAttempts
      };

    } catch (error) {
      console.error('❌ Error verificando bloqueo de cuenta:', error);
      return { locked: false, remainingAttempts: this.MAX_ATTEMPTS };
    }
  }

  /**
   * Incrementar intentos fallidos y bloquear si es necesario
   */
  static async handleFailedAttempt(
    email: string
  ): Promise<{ 
    locked: boolean; 
    attempts: number; 
    remainingAttempts: number;
    justLocked?: boolean;
  }> {
    try {
      // Obtener estado actual
      const currentState = await this.isAccountLocked(email);
      
      // Si ya está bloqueado, retornar estado actual
      if (currentState.locked) {
        return { 
          locked: true, 
          attempts: currentState.attempts || 0, 
          remainingAttempts: 0 
        };
      }

      // Incrementar intentos
      const newAttempts = (currentState.attempts || 0) + 1;
      let locked = false;
      let justLocked = false;

      // Si supera el límite, bloquear cuenta
      if (newAttempts >= this.MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
        locked = true;
        justLocked = true;
        
        // Insertar o actualizar en login_security
        await pool.query(
          `INSERT INTO login_security (email, login_attempts, last_login_attempt, login_blocked_until) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (email) 
           DO UPDATE SET 
             login_attempts = $2, 
             last_login_attempt = $3, 
             login_blocked_until = $4,
             updated_at = CURRENT_TIMESTAMP`,
          [email, newAttempts, new Date(), lockUntil]
        );

        console.log(`🔒 CUENTA BLOQUEADA: ${email} por ${this.LOCK_DURATION_MINUTES} minutos`);
      } else {
        // Solo incrementar intentos
        await pool.query(
          `INSERT INTO login_security (email, login_attempts, last_login_attempt) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (email) 
           DO UPDATE SET 
             login_attempts = $2, 
             last_login_attempt = $3,
             updated_at = CURRENT_TIMESTAMP`,
          [email, newAttempts, new Date()]
        );
      }

      const remainingAttempts = Math.max(0, this.MAX_ATTEMPTS - newAttempts);

      return { 
        locked, 
        attempts: newAttempts, 
        remainingAttempts: remainingAttempts,
        justLocked 
      };

    } catch (error) {
      console.error('Error manejando intento fallido:', error);
      return { 
        locked: false, 
        attempts: 0, 
        remainingAttempts: this.MAX_ATTEMPTS 
      };
    }
  }

  /**
   * Limpiar intentos fallidos después de login exitoso
   */
  static async clearFailedAttempts(email: string): Promise<void> {
    try {
      await pool.query(
        'DELETE FROM login_security WHERE email = $1',
        [email]
      );
    } catch (error) {
      console.error('Error limpiando intentos fallidos:', error);
    }
  }

  /**
   * Limpiar bloqueos expirados automáticamente
   */
  static async cleanupExpiredLocks(): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM login_security WHERE login_blocked_until < NOW()'
      );
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 Limpiados ${result.rowCount} bloqueos de login expirados`);
      }
    } catch (error) {
      console.error('Error limpiando bloqueos expirados:', error);
    }
  }

  /**
   * Obtener estadísticas de seguridad
   */
  static async getSecurityStats(email: string): Promise<{
    attempts: number;
    remainingAttempts: number;
    isLocked: boolean;
    lockedUntil?: string;
    lastAttempt?: string;
  }> {
    try {
      const result = await pool.query(
        'SELECT login_attempts, last_login_attempt, login_blocked_until FROM login_security WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return {
          attempts: 0,
          remainingAttempts: this.MAX_ATTEMPTS,
          isLocked: false
        };
      }

      const security = result.rows[0];
      const hasta = this.aFechaUTC(security.login_blocked_until);
      const isLocked = !!hasta && hasta > new Date();
      const remainingAttempts = Math.max(0, this.MAX_ATTEMPTS - security.login_attempts);

      return {
        attempts: security.login_attempts,
        remainingAttempts: remainingAttempts,
        isLocked: isLocked,
        lockedUntil: hasta ? hasta.toISOString() : undefined,
        lastAttempt: this.aFechaUTC(security.last_login_attempt)?.toISOString()
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de seguridad:', error);
      return {
        attempts: 0,
        remainingAttempts: this.MAX_ATTEMPTS,
        isLocked: false
      };
    }
  }
}