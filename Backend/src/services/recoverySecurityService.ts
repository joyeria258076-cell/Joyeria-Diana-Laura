import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export class RecoverySecurityService {
  // Límites para recuperación de contraseña
  public static readonly MAX_RECOVERY_ATTEMPTS = 3;
  public static readonly LOCK_DURATION_MINUTES = 2;

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
   * Verificar límites de recuperación - CORREGIDA
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
      
      console.log(`🔍 Estado actual de ${email}:`, {
        intentos: user.recovery_attempts,
        bloqueado_hasta: user.recovery_blocked_until,
        ahora: now
      });

      // 🛑 **CORRECCIÓN: Verificar bloqueo existente primero**
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
          // 🆕 CORRECCIÓN: Si el bloqueo ya expiró, resetear intentos
          console.log(`🔄 Bloqueo expirado, liberando automáticamente: ${email}`);
          await this.resetRecoveryAttempts(email);
          return { allowed: true, remainingAttempts: this.MAX_RECOVERY_ATTEMPTS };
        }
      }

      // 🆕 CORRECCIÓN: Calcular intentos restantes correctamente
      const remainingAttempts = Math.max(0, this.MAX_RECOVERY_ATTEMPTS - (user.recovery_attempts || 0));
      
      console.log(`📊 Intentos actuales: ${user.recovery_attempts || 0}, Restantes: ${remainingAttempts}`);

      return { 
        allowed: true, 
        remainingAttempts: remainingAttempts 
      };

    } catch (error) {
      console.error('Error en checkRecoveryLimits:', error);
      return { allowed: true, remainingAttempts: this.MAX_RECOVERY_ATTEMPTS };
    } finally {
      await client.end();
    }
  }

  /**
   * Incrementar intentos de recuperación - CORREGIDA
   */
  static async incrementRecoveryAttempts(email: string): Promise<void> {
    const client = await this.getClient();
    
    try {
      await client.connect();
      
      // 🆕 CORRECCIÓN: Primero obtener el estado actual
      const currentResult = await client.query(
        `SELECT recovery_attempts FROM usuarios WHERE email = $1`,
        [email]
      );

      let currentAttempts = 0;
      if (currentResult.rows.length > 0) {
        currentAttempts = currentResult.rows[0].recovery_attempts || 0;
      }

      const newAttempts = currentAttempts + 1;
      
      console.log(`📈 Incrementando intentos para ${email}: ${currentAttempts} -> ${newAttempts}`);

      // 🆕 CORRECCIÓN: Si alcanza el máximo, bloquear
      if (newAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
        const blockedUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
        
        await client.query(
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
        await client.query(
          `UPDATE usuarios 
           SET recovery_attempts = $1, 
               last_recovery_attempt = CURRENT_TIMESTAMP 
           WHERE email = $2`,
          [newAttempts, email]
        );
      }
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
      
      console.log(`🔄 Intentos reseteados para: ${email}`);
    } catch (error) {
      console.error('Error en resetRecoveryAttempts:', error);
    } finally {
      await client.end();
    }
  }

  /**
   * Resetear intentos después de recuperación exitosa
   */
  static async resetAfterSuccessfulRecovery(email: string): Promise<void> {
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
      
      console.log(`✅ Intentos de recuperación reseteados para: ${email}`);
    } catch (error) {
      console.error('Error reseteando intentos después de recuperación exitosa:', error);
    } finally {
      await client.end();
    }
  }
}