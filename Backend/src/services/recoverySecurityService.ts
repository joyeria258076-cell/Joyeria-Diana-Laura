import { Client } from 'pg';
import dotenv from 'dotenv';
import { pool } from '../config/database';

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
    
    console.log(`🔍 Estado actual de ${email}:`, {
      intentos: user.recovery_attempts,
      bloqueado_hasta: user.recovery_blocked_until,
      ahora: now
    });

    // 🛑 **CORRECCIÓN 1: Verificar bloqueo existente primero**
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
        console.log(`🔄 Bloqueo expirado, liberando automáticamente: ${email}`);
        await this.resetRecoveryAttempts(email);
        return { allowed: true, remainingAttempts: this.MAX_RECOVERY_ATTEMPTS };
      }
    }

    // 🛑 **CORRECCIÓN 2: Calcular intentos restantes CORRECTAMENTE**
    const remainingAttempts = Math.max(0, this.MAX_RECOVERY_ATTEMPTS - user.recovery_attempts);
    
    // 🛑 **CORRECCIÓN 3: Solo bloquear si se alcanzó el máximo Y NO está ya bloqueado**
    if (user.recovery_attempts >= this.MAX_RECOVERY_ATTEMPTS && !user.recovery_blocked_until) {
      const blockedUntil = new Date(now.getTime() + this.LOCK_DURATION_MINUTES * 60 * 1000);
      
      await client.query(
        'UPDATE usuarios SET recovery_blocked_until = $1 WHERE email = $2',
        [blockedUntil, email]
      );
      
      console.log(`🔒 NUEVO BLOQUEO aplicado para: ${email} por ${this.LOCK_DURATION_MINUTES} minutos`);
      
      return { 
        allowed: false, 
        remainingAttempts: 0, 
        remainingTime: this.LOCK_DURATION_MINUTES,
        blockedUntil 
      };
    }

    // 🛑 ** Si ya está bloqueado pero no en la verificación inicial**
    if (user.recovery_attempts >= this.MAX_RECOVERY_ATTEMPTS && user.recovery_blocked_until) {
      const blockedUntil = new Date(user.recovery_blocked_until);
      const remainingTime = Math.ceil((blockedUntil.getTime() - now.getTime()) / (1000 * 60));
      
      return { 
        allowed: false, 
        remainingAttempts: 0, 
        remainingTime,
        blockedUntil 
      };
    }



    // 🛑 **CORRECCIÓN 5: Devolver los intentos reales restantes**
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

async function debugRecoveryAttempts(email: string) {
  try {
    console.log(`🔍 Debuggeando intentos de recuperación para: ${email}`);
    
    // 1. Verificar estado actual del usuario
    const userResult = await pool.query(`
      SELECT 
        email,
        recovery_attempts,
        last_recovery_attempt,
        recovery_blocked_until,
        fecha_creacion
      FROM usuarios 
      WHERE email = $1
    `, [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('📊 Estado del usuario:');
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Intentos de recuperación: ${user.recovery_attempts}`);
    console.log(`   - Último intento: ${user.last_recovery_attempt}`);
    console.log(`   - Bloqueado hasta: ${user.recovery_blocked_until}`);
    
    // 2. Verificar si debería estar bloqueado
    const now = new Date();
    if (user.recovery_blocked_until) {
      const blockedUntil = new Date(user.recovery_blocked_until);
      const isBlocked = blockedUntil > now;
      const remainingMinutes = isBlocked ? Math.ceil((blockedUntil.getTime() - now.getTime()) / (1000 * 60)) : 0;
      
      console.log(`   - Está bloqueado actualmente: ${isBlocked ? '✅ SI' : '❌ NO'}`);
      console.log(`   - Minutos restantes: ${remainingMinutes}`);
    }
    
    // 3. Verificar intentos recientes desde login_attempts
    const attemptsResult = await pool.query(`
      SELECT COUNT(*) as recent_attempts 
      FROM login_attempts 
      WHERE email = $1 AND attempt_time > NOW() - INTERVAL '2 minutes'
      AND failure_reason LIKE '%recovery%'
    `, [email]);
    
    console.log(`   - Intentos recientes (2 min): ${attemptsResult.rows[0].recent_attempts}`);
    
    // 4. Calcular intentos restantes según la lógica del sistema
    const MAX_ATTEMPTS = 3;
    const remainingAttempts = Math.max(0, MAX_ATTEMPTS - user.recovery_attempts);
    console.log(`   - Intentos restantes calculados: ${remainingAttempts}`);
    
    console.log('✅ Debug completado');
    
  } catch (error: any) {
    console.error('❌ Error en debug:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar con el email que tiene problemas
debugRecoveryAttempts('tu-email@ejemplo.com');