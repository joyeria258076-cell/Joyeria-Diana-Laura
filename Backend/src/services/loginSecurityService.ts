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

export interface AccountLock {
  id?: number;
  email: string;
  ip_address: string;
  attempt_count: number;
  locked_until: Date;
  lock_reason: string;
}

export class LoginSecurityService {
  // 🎯 HACER CONSTANTES PÚBLICAS para acceso externo
  public static readonly MAX_ATTEMPTS = 3;
  public static readonly LOCK_DURATION_MINUTES = 15;

  /**
   * Obtener duración del bloqueo (para uso externo)
   */
  static getLockDurationMinutes(): number {
    return this.LOCK_DURATION_MINUTES;
  }

  /**
   * Obtener máximo de intentos (para uso externo)
   */
  static getMaxAttempts(): number {
    return this.MAX_ATTEMPTS;
  }

  /**
   * Registrar intento de login
   */
  static async recordLoginAttempt(attempt: LoginAttempt): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason) 
         VALUES ($1, $2, $3, $4, $5)`,
        [attempt.email, attempt.ip_address, attempt.user_agent, attempt.success, attempt.failure_reason]
      );
    } catch (error) {
      console.error('Error registrando intento de login:', error);
    }
  }

  /**
   * Verificar si la cuenta está bloqueada
   */
  static async isAccountLocked(email: string, ipAddress: string): Promise<{ locked: boolean; lockedUntil?: Date; attempts?: number }> {
    try {
      // Buscar bloqueos activos por email
      const result = await pool.query(
        `SELECT locked_until, attempt_count 
         FROM account_locks 
         WHERE email = $1 AND locked_until > NOW()`,
        [email]
      );

      if (result.rows.length > 0) {
        const lock = result.rows[0];
        return {
          locked: true,
          lockedUntil: lock.locked_until,
          attempts: lock.attempt_count
        };
      }

      return { locked: false };
    } catch (error) {
      console.error('Error verificando bloqueo de cuenta:', error);
      return { locked: false };
    }
  }

  /**
   * Incrementar contador de intentos fallidos y bloquear si es necesario
   */
  static async handleFailedAttempt(email: string, ipAddress: string, userAgent?: string, reason?: string): Promise<{ locked: boolean; attempts: number }> {
    try {
      // Registrar intento fallido
      await this.recordLoginAttempt({
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        failure_reason: reason
      });

      // Obtener intentos fallidos recientes (últimos 15 minutos)
      const recentAttempts = await pool.query(
        `SELECT COUNT(*) as count 
         FROM login_attempts 
         WHERE email = $1 AND success = false AND attempt_time > NOW() - INTERVAL '15 minutes'`,
        [email]
      );

      const attemptCount = parseInt(recentAttempts.rows[0].count);

      // Si supera el límite, bloquear cuenta
      if (attemptCount >= this.MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
        
        // Insertar o actualizar bloqueo
        await pool.query(
          `INSERT INTO account_locks (email, ip_address, attempt_count, locked_until, lock_reason) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (email) 
           DO UPDATE SET 
             attempt_count = $3, 
             locked_until = $4, 
             updated_at = CURRENT_TIMESTAMP`,
          [email, ipAddress, attemptCount, lockUntil, 'too_many_attempts']
        );

        return { locked: true, attempts: attemptCount };
      }

      return { locked: false, attempts: attemptCount };
    } catch (error) {
      console.error('Error manejando intento fallido:', error);
      return { locked: false, attempts: 0 };
    }
  }

  /**
   * Limpiar intentos fallidos después de login exitoso
   */
  static async clearFailedAttempts(email: string): Promise<void> {
    try {
      // Eliminar bloqueos existentes
      await pool.query(
        'DELETE FROM account_locks WHERE email = $1',
        [email]
      );

      // También podríamos limpiar intentos fallidos antiguos
      await pool.query(
        `DELETE FROM login_attempts 
         WHERE email = $1 AND success = false AND attempt_time < NOW() - INTERVAL '1 hour'`,
        [email]
      );
    } catch (error) {
      console.error('Error limpiando intentos fallidos:', error);
    }
  }

  /**
   * Obtener estadísticas de seguridad para un email
   */
  static async getSecurityStats(email: string): Promise<{
    totalAttempts: number;
    failedAttempts: number;
    lastAttempt?: Date;
    isLocked: boolean;
    lockedUntil?: Date;
  }> {
    try {
      const totalResult = await pool.query(
        'SELECT COUNT(*) as count FROM login_attempts WHERE email = $1',
        [email]
      );

      const failedResult = await pool.query(
        'SELECT COUNT(*) as count FROM login_attempts WHERE email = $1 AND success = false',
        [email]
      );

      const lastResult = await pool.query(
        'SELECT MAX(attempt_time) as last_attempt FROM login_attempts WHERE email = $1',
        [email]
      );

      const lockResult = await pool.query(
        'SELECT locked_until FROM account_locks WHERE email = $1 AND locked_until > NOW()',
        [email]
      );

      return {
        totalAttempts: parseInt(totalResult.rows[0].count),
        failedAttempts: parseInt(failedResult.rows[0].count),
        lastAttempt: lastResult.rows[0].last_attempt,
        isLocked: lockResult.rows.length > 0,
        lockedUntil: lockResult.rows[0]?.locked_until
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de seguridad:', error);
      return {
        totalAttempts: 0,
        failedAttempts: 0,
        isLocked: false
      };
    }
  }

  /**
   * Limpieza automática de registros antiguos
   */
  static async cleanupOldRecords(): Promise<void> {
    try {
      // Eliminar intentos de login con más de 30 días
      await pool.query(
        'DELETE FROM login_attempts WHERE attempt_time < NOW() - INTERVAL \'30 days\''
      );

      // Eliminar bloqueos expirados
      await pool.query(
        'DELETE FROM account_locks WHERE locked_until < NOW() - INTERVAL \'7 days\''
      );

      console.log('🧹 Limpieza de registros de seguridad completada');
    } catch (error) {
      console.error('Error en limpieza de registros:', error);
    }
  }
}