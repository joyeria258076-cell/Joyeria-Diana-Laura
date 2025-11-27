// Backend/src/scripts/debug-recovery-attempts.ts
import { pool } from '../config/database';

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
debugRecoveryAttempts('joyeria258076@gmail.com');