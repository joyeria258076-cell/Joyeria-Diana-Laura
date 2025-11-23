import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export class RecoverySecurityService {
  // Límites para recuperación de contraseña
  public static readonly MAX_RECOVERY_ATTEMPTS = 3;
  public static readonly LOCK_DURATION_MINUTES = 15;

  private static async getClient(): Promise<Client> {
    return new Client({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
    });
  }

  /**
   * Verificar límites de recuperación
   */
  static async checkRecoveryLimits(email: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    remainingTime?: number;
    blockedUntil?: Date;
  }> {
    const client = await this.getClient();
    
    try {
      await client.connect();

      const result = await client.query(
        `SELECT recovery_attempts, last_recovery_attempt, recovery_blocked_until 
         FROM usuarios WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return { allowed: true, remainingAttempts: this.MAX_RECOVERY_ATTEMPTS };
      }

      const user = result.rows[0];
      const now = new Date();
      
      // Si está bloqueado, verificar si ya pasó el tiempo
      if (user.recovery_blocked_until) {
        const blockedUntil = new Date(user.recovery_blocked_until);
        if (blockedUntil > now) {
          const remainingTime = Math.ceil((blockedUntil.getTime() - now.getTime()) / (1000 * 60));
          return { 
            allowed: false, 
            remainingAttempts: 0, 
            remainingTime,
            blockedUntil 
          };
        } else {
          // Resetear si ya pasó el bloqueo
          await this.resetRecoveryAttempts(email);
          return { allowed: true, remainingAttempts: this.MAX_RECOVERY_ATTEMPTS };
        }
      }

      // Verificar intentos recientes
      const remainingAttempts = Math.max(0, this.MAX_RECOVERY_ATTEMPTS - user.recovery_attempts);
      
      if (user.recovery_attempts >= this.MAX_RECOVERY_ATTEMPTS) {
        // Bloquear por 15 minutos
        const blockedUntil = new Date(now.getTime() + this.LOCK_DURATION_MINUTES * 60 * 1000);
        await client.query(
          'UPDATE usuarios SET recovery_blocked_until = $1 WHERE email = $2',
          [blockedUntil, email]
        );
        
        return { 
          allowed: false, 
          remainingAttempts: 0, 
          remainingTime: this.LOCK_DURATION_MINUTES,
          blockedUntil 
        };
      }

      return { allowed: true, remainingAttempts };

    } catch (error) {
      console.error('Error en checkRecoveryLimits:', error);
      return { allowed: true, remainingAttempts: this.MAX_RECOVERY_ATTEMPTS };
    } finally {
      await client.end();
    }
  }

  /**
   * Incrementar intentos de recuperación
   */
  static async incrementRecoveryAttempts(email: string): Promise<void> {
    const client = await this.getClient();
    
    try {
      await client.connect();
      
      await client.query(
        `UPDATE usuarios 
         SET recovery_attempts = recovery_attempts + 1, 
             last_recovery_attempt = CURRENT_TIMESTAMP 
         WHERE email = $1`,
        [email]
      );
    } catch (error) {
      console.error('Error en incrementRecoveryAttempts:', error);
    } finally {
      await client.end();
    }
  }

  /**
   * Resetear intentos de recuperación
   */
  static async resetRecoveryAttempts(email: string): Promise<void> {
    const client = await this.getClient();
    
    try {
      await client.connect();
      
      await client.query(
        `UPDATE usuarios 
         SET recovery_attempts = 0, 
             recovery_blocked_until = NULL,
             last_recovery_attempt = NULL 
         WHERE email = $1`,
        [email]
      );
    } catch (error) {
      console.error('Error en resetRecoveryAttempts:', error);
    } finally {
      await client.end();
    }
  }
}