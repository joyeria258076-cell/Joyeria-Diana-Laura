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
  public static readonly MAX_ATTEMPTS = 3;
  public static readonly LOCK_DURATION_MINUTES = 5;

  static getLockDurationMinutes(): number {
    return this.LOCK_DURATION_MINUTES;
  }

  static getMaxAttempts(): number {
    return this.MAX_ATTEMPTS;
  }

  static async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    try {
      // ✅ CORREGIDO: agregar esquema seguridad
      await pool.query(
        `INSERT INTO seguridad.login_attempts (email, ip_address, user_agent, success, failure_reason) 
         VALUES ($1, $2, $3, $4, $5)`,
        [attempt.email, attempt.ip_address, attempt.user_agent, attempt.success, attempt.failure_reason]
      );
    } catch (error) {
      console.error('❌ Error registrando intento de login:', error);
    }
  }

  static async isAccountLocked(email: string): Promise<{ 
    locked: boolean; 
    lockedUntil?: Date; 
    attempts?: number;
    remainingAttempts?: number;
  }> {
    try {
      // ✅ CORREGIDO: agregar esquema seguridad
      const result = await pool.query(
        `SELECT login_attempts, login_blocked_until 
         FROM seguridad.login_security 
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

      if (security.login_blocked_until && new Date(security.login_blocked_until) > now) {
        return {
          locked: true,
          lockedUntil: security.login_blocked_until,
          attempts: security.login_attempts,
          remainingAttempts: 0
        };
      }

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

  static async handleFailedAttempt(
    email: string
  ): Promise<{ 
    locked: boolean; 
    attempts: number; 
    remainingAttempts: number;
    justLocked?: boolean;
  }> {
    try {
      const currentState = await this.isAccountLocked(email);
      
      if (currentState.locked) {
        return { 
          locked: true, 
          attempts: currentState.attempts || 0, 
          remainingAttempts: 0 
        };
      }

      const newAttempts = (currentState.attempts || 0) + 1;
      let locked = false;
      let justLocked = false;

      if (newAttempts >= this.MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
        locked = true;
        justLocked = true;
        
        // ✅ CORREGIDO: agregar esquema seguridad
        await pool.query(
          `INSERT INTO seguridad.login_security (email, login_attempts, last_login_attempt, login_blocked_until) 
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
        // ✅ CORREGIDO: agregar esquema seguridad
        await pool.query(
          `INSERT INTO seguridad.login_security (email, login_attempts, last_login_attempt) 
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

  static async clearFailedAttempts(email: string): Promise<void> {
    try {
      // ✅ CORREGIDO: agregar esquema seguridad
      await pool.query(
        'DELETE FROM seguridad.login_security WHERE email = $1',
        [email]
      );
    } catch (error) {
      console.error('Error limpiando intentos fallidos:', error);
    }
  }

  static async cleanupExpiredLocks(): Promise<void> {
    try {
      // ✅ CORREGIDO: agregar esquema seguridad
      const result = await pool.query(
        'DELETE FROM seguridad.login_security WHERE login_blocked_until < NOW()'
      );
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 Limpiados ${result.rowCount} bloqueos de login expirados`);
      }
    } catch (error) {
      console.error('Error limpiando bloqueos expirados:', error);
    }
  }

  static async getSecurityStats(email: string): Promise<{
    attempts: number;
    remainingAttempts: number;
    isLocked: boolean;
    lockedUntil?: Date;
    lastAttempt?: Date;
  }> {
    try {
      // ✅ CORREGIDO: agregar esquema seguridad
      const result = await pool.query(
        'SELECT login_attempts, last_login_attempt, login_blocked_until FROM seguridad.login_security WHERE email = $1',
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
      const isLocked = security.login_blocked_until && new Date(security.login_blocked_until) > new Date();
      const remainingAttempts = Math.max(0, this.MAX_ATTEMPTS - security.login_attempts);

      return {
        attempts: security.login_attempts,
        remainingAttempts: remainingAttempts,
        isLocked: isLocked,
        lockedUntil: security.login_blocked_until,
        lastAttempt: security.last_login_attempt
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