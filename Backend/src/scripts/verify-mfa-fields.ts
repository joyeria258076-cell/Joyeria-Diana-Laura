// Backend/src/scripts/verify-mfa-fields.ts
import { pool } from '../config/database';

async function verifyMFAFields() {
  try {
    console.log('🔍 Verificando campos MFA en tabla usuarios...');
    
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name IN ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes')
      ORDER BY column_name
    `);
    
    console.log('📊 Campos MFA encontrados:');
    result.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} (default: ${row.column_default})`);
    });
    
    if (result.rows.length === 0) {
      console.log('❌ No se encontraron campos MFA. Ejecuta el script de migración.');
    } else if (result.rows.length === 3) {
      console.log('✅ Todos los campos MFA están presentes');
    } else {
      console.log('⚠️ Faltan algunos campos MFA');
    }
    
  } catch (error) {
    console.error('❌ Error verificando campos MFA:', error);
  } finally {
    await pool.end();
  }
}

verifyMFAFields();