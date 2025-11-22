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
  // 🎯 AUMENTAR A 7 INTENTOS como pidió tu compañero
  public static readonly MAX_ATTEMPTS = 7;
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
      console.log(`📝 Registrando intento de login: ${attempt.email}, éxito: ${attempt.success}, razón: ${attempt.failure_reason}`);
      
      await pool.query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason) 
         VALUES ($1, $2, $3, $4, $5)`,
        [attempt.email, attempt.ip_address, attempt.user_agent, attempt.success, attempt.failure_reason]
      );
      
      console.log(`✅ Intento registrado en BD para: ${attempt.email}`);
    } catch (error) {
      console.error('❌ Error registrando intento de login:', error);
    }
  }

  /**
   * Verificar si la cuenta está bloqueada
   */
  static async isAccountLocked(email: string, ipAddress: string): Promise<{ 
    locked: boolean; 
    lockedUntil?: Date; 
    attempts?: number;
    remainingAttempts?: number;
  }> {
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

      // Si no está bloqueado, calcular intentos restantes
      const recentAttempts = await this.getRecentFailedAttempts(email);
      const remainingAttempts = this.MAX_ATTEMPTS - recentAttempts;
      
      return { 
        locked: false, 
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0 
      };
    } catch (error) {
      console.error('Error verificando bloqueo de cuenta:', error);
      return { locked: false, remainingAttempts: this.MAX_ATTEMPTS };
    }
  }

  /**
   * Obtener número de intentos fallidos recientes
   */
  static async getRecentFailedAttempts(email: string): Promise<number> {
    try {
      const recentAttempts = await pool.query(
        `SELECT COUNT(*) as count 
         FROM login_attempts 
         WHERE email = $1 AND success = false AND attempt_time > NOW() - INTERVAL '15 minutes'`,
        [email]
      );

      return parseInt(recentAttempts.rows[0].count);
    } catch (error) {
      console.error('Error obteniendo intentos recientes:', error);
      return 0;
    }
  }

  /**
   * Incrementar contador de intentos fallidos y bloquear si es necesario
   */
  static async handleFailedAttempt(
    email: string, 
    ipAddress: string, 
    userAgent?: string, 
    reason?: string
  ): Promise<{ 
    locked: boolean; 
    attempts: number; 
    remainingAttempts: number;
    justLocked?: boolean;
  }> {
    try {
      // Registrar intento fallido
      await this.recordLoginAttempt({
        email,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        failure_reason: reason
      });

      // Obtener intentos fallidos recientes
      const attemptCount = await this.getRecentFailedAttempts(email);
      const remainingAttempts = this.MAX_ATTEMPTS - attemptCount;

      console.log(`🔐 Intentos fallidos para ${email}: ${attemptCount}/${this.MAX_ATTEMPTS}, Restantes: ${remainingAttempts}`);

      // Si supera el límite, bloquear cuenta
      if (attemptCount >= this.MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
        
        console.log(`🔒 Bloqueando cuenta ${email} por ${this.LOCK_DURATION_MINUTES} minutos`);
        
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

        return { 
          locked: true, 
          attempts: attemptCount, 
          remainingAttempts: 0,
          justLocked: true 
        };
      }

      return { 
        locked: false, 
        attempts: attemptCount, 
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0 
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
      console.log(`🧹 Limpiando intentos fallidos para: ${email}`);
      
      // Eliminar bloqueos existentes
      await pool.query(
        'DELETE FROM account_locks WHERE email = $1',
        [email]
      );

      // También limpiar intentos fallidos antiguos
      await pool.query(
        `DELETE FROM login_attempts 
         WHERE email = $1 AND success = false AND attempt_time < NOW() - INTERVAL '1 hour'`,
        [email]
      );
      
      console.log(`✅ Intentos limpiados para: ${email}`);
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
    recentFailedAttempts: number;
    lastAttempt?: Date;
    isLocked: boolean;
    lockedUntil?: Date;
    remainingAttempts: number;
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

      const recentFailed = await this.getRecentFailedAttempts(email);

      const lastResult = await pool.query(
        'SELECT MAX(attempt_time) as last_attempt FROM login_attempts WHERE email = $1',
        [email]
      );

      const lockResult = await pool.query(
        'SELECT locked_until FROM account_locks WHERE email = $1 AND locked_until > NOW()',
        [email]
      );

      const remainingAttempts = this.MAX_ATTEMPTS - recentFailed;

      return {
        totalAttempts: parseInt(totalResult.rows[0].count),
        failedAttempts: parseInt(failedResult.rows[0].count),
        recentFailedAttempts: recentFailed,
        lastAttempt: lastResult.rows[0].last_attempt,
        isLocked: lockResult.rows.length > 0,
        lockedUntil: lockResult.rows[0]?.locked_until,
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de seguridad:', error);
      return {
        totalAttempts: 0,
        failedAttempts: 0,
        recentFailedAttempts: 0,
        isLocked: false,
        remainingAttempts: this.MAX_ATTEMPTS
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