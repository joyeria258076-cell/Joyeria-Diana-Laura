// Backend/src/scripts/fix-user-mfa.ts
import { pool } from '../config/database';

async function fixUserMFA(userId: number) {
  try {
    console.log(`🔧 Corrigiendo MFA para usuario ID: ${userId}...`);
    
    // 1. Verificar estado actual
    const userResult = await pool.query(`
      SELECT email, mfa_enabled, mfa_secret 
      FROM usuarios WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`📊 Estado actual:`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - MFA Activado: ${user.mfa_enabled}`);
    console.log(`   - Tiene secreto: ${!!user.mfa_secret}`);
    
    // 2. Corregir inconsistencia
    if (user.mfa_secret && !user.mfa_enabled) {
      console.log('🔄 Activando MFA (tiene secreto pero no está activado)...');
      await pool.query(`
        UPDATE usuarios 
        SET mfa_enabled = true 
        WHERE id = $1
      `, [userId]);
      console.log('✅ MFA activado correctamente');
    } else if (!user.mfa_secret && user.mfa_enabled) {
      console.log('🔄 Desactivando MFA (está activado pero no tiene secreto)...');
      await pool.query(`
        UPDATE usuarios 
        SET mfa_enabled = false 
        WHERE id = $1
      `, [userId]);
      console.log('✅ MFA desactivado correctamente');
    } else {
      console.log('✅ Estado MFA consistente');
    }
    
  } catch (error: any) {
    console.error('❌ Error corrigiendo MFA:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar para el usuario con problemas (cambia el ID)
fixUserMFA(144); // 🆕 CAMBIA ESTE ID POR EL DE TU USUARIO