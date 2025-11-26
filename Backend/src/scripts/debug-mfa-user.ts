// Backend/src/scripts/debug-mfa-user.ts
import { pool } from '../config/database';

async function debugMFAUser(email: string) {
  try {
    console.log(`🔍 Debuggeando usuario MFA: ${email}`);
    
    // 1. Verificar usuario
    const userResult = await pool.query(`
      SELECT 
        id,
        email,
        mfa_enabled,
        mfa_secret,
        mfa_backup_codes,
        firebase_uid
      FROM usuarios 
      WHERE email = $1
    `, [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('📊 Datos del usuario:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - MFA Activado: ${user.mfa_enabled}`);
    console.log(`   - Tiene secreto: ${!!user.mfa_secret}`);
    console.log(`   - Firebase UID: ${user.firebase_uid}`);
    
    // 2. Verificar sesiones activas
    const sessionsResult = await pool.query(`
      SELECT COUNT(*) as active_sessions 
      FROM user_sessions 
      WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()
    `, [user.id]);
    
    console.log(`   - Sesiones activas: ${sessionsResult.rows[0].active_sessions}`);
    
    // 3. Verificar intentos de login recientes
    const loginAttemptsResult = await pool.query(`
      SELECT COUNT(*) as recent_attempts 
      FROM login_attempts 
      WHERE email = $1 AND attempt_time > NOW() - INTERVAL '1 hour'
    `, [email]);
    
    console.log(`   - Intentos de login (última hora): ${loginAttemptsResult.rows[0].recent_attempts}`);
    
    console.log('✅ Debug completado');
    
  } catch (error: any) {
    console.error('❌ Error en debug:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar con el email del usuario con problemas
debugMFAUser('delfinomaximo123@gmail.com');