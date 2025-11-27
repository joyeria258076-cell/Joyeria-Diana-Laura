import { pool } from '../config/database';

export class RecoverySecurityService {
  // Límites para recuperación de contraseña
  public static readonly MAX_RECOVERY_ATTEMPTS = 3;
  public static readonly LOCK_DURATION_MINUTES = 2;

  /**
   * Verificar límites de recuperación - CORREGIDO
   */
  static async checkRecoveryLimits(email: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    remainingTime?: number;
    blockedUntil?: Date;
  }> {
    try {
      console.log(`🔍 Verificando límites para: ${email}`);

      const result = await pool.query(
        `SELECT recovery_attempts, last_recovery_attempt, recovery_blocked_until 
         FROM usuarios WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        console.log(`✅ Usuario nuevo, intentos disponibles: ${this.MAX_RECOVERY_ATTEMPTS}`);
        return { allowed: true, remainingAttempts: this.MAX_RECOVERY_ATTEMPTS };
      }

      const user = result.rows[0];
      const now = new Date();
      
      console.log(`📊 Estado actual de ${email}:`, {
        intentos: user.recovery_attempts,
        bloqueado_hasta: user.recovery_blocked_until,
        ahora: now
      });

      // Verificar si está bloqueado
      if (user.recovery_blocked_until) {
        const blockedUntil = new Date(user.recovery_blocked_until);
        if (blockedUntil > now) {
          const remainingTime = Math.ceil((blockedUntil.getTime() - now.getTime()) / (1000 * 60));
          console.log(`🚫 Usuario bloqueado. Tiempo restante: ${remainingTime} minutos`);
          return { 
            allowed: false, 
            remainingAttempts: 0, 
            remainingTime,
            blockedUntil 
          };
        } else {
          // Bloqueo expirado, resetear
          console.log(`🔄 Bloqueo expirado, liberando automáticamente: ${email}`);
          await this.resetRecoveryAttempts(email);
          return { allowed: true, remainingAttempts: this.MAX_RECOVERY_ATTEMPTS };
        }
      }

      // Calcular intentos restantes
      const currentAttempts = user.recovery_attempts || 0;
      const remainingAttempts = Math.max(0, this.MAX_RECOVERY_ATTEMPTS - currentAttempts);
      
      console.log(`📊 Intentos actuales: ${currentAttempts}, Restantes: ${remainingAttempts}`);

      return { 
        allowed: remainingAttempts > 0, 
        remainingAttempts: remainingAttempts 
      };

    } catch (error: any) {
      console.error('❌ Error en checkRecoveryLimits:', error);
      // En caso de error, permitir por seguridad
      return { allowed: true, remainingAttempts: this.MAX_RECOVERY_ATTEMPTS };
    }
  }

  /**
   * Incrementar intentos de recuperación - CORREGIDO
   */
  static async incrementRecoveryAttempts(email: string): Promise<void> {
    try {
      console.log(`📈 Incrementando intentos para: ${email}`);
      
      // Primero obtener el estado actual
      const currentResult = await pool.query(
        `SELECT recovery_attempts FROM usuarios WHERE email = $1`,
        [email]
      );

      let currentAttempts = 0;
      if (currentResult.rows.length > 0) {
        currentAttempts = currentResult.rows[0].recovery_attempts || 0;
      }

      const newAttempts = currentAttempts + 1;
      
      console.log(`📈 Incrementando intentos: ${currentAttempts} -> ${newAttempts}`);

      // Si alcanza el máximo, bloquear
      if (newAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
        const blockedUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
        
        await pool.query(
          `UPDATE usuarios 
           SET recovery_attempts = $1, 
               last_recovery_attempt = CURRENT_TIMESTAMP,
               recovery_blocked_until = $2
           WHERE email = $3`,
          [newAttempts, blockedUntil, email]
        );
        
        console.log(`🔒 Usuario bloqueado por recuperación: ${email} por ${this.LOCK_DURATION_MINUTES} minutos`);
      } else {
        // Solo incrementar intentos
        await pool.query(
          `UPDATE usuarios 
           SET recovery_attempts = $1, 
               last_recovery_attempt = CURRENT_TIMESTAMP 
           WHERE email = $2`,
          [newAttempts, email]
        );
        
        console.log(`✅ Intentos incrementados a: ${newAttempts}`);
      }
    } catch (error: any) {
      console.error('❌ Error en incrementRecoveryAttempts:', error);
      throw error; // Propagar el error para manejarlo en el controlador
    }
  }

  /**
   * Resetear intentos de recuperación
   */
  static async resetRecoveryAttempts(email: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE usuarios 
         SET recovery_attempts = 0, 
             recovery_blocked_until = NULL,
             last_recovery_attempt = NULL 
         WHERE email = $1`,
        [email]
      );
      
      console.log(`🔄 Intentos reseteados para: ${email}`);
    } catch (error: any) {
      console.error('❌ Error en resetRecoveryAttempts:', error);
      throw error;
    }
  }

  /**
   * Resetear intentos después de recuperación exitosa
   */
  static async resetAfterSuccessfulRecovery(email: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE usuarios 
          SET recovery_attempts = 0, 
              recovery_blocked_until = NULL,
              last_recovery_attempt = NULL 
          WHERE email = $1`,
        [email]
      );
      
      console.log(`✅ Intentos de recuperación reseteados para: ${email}`);
    } catch (error: any) {
      console.error('❌ Error reseteando intentos después de recuperación exitosa:', error);
      throw error;
    }
  }
}