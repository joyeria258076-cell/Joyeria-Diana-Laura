// Backend/src/scripts/verify-mfa-fields.ts
/*import { pool } from '../config/database';

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

// Backend/src/scripts/fix-mfa-fields.ts
import { pool } from '../config/database';

async function fixMFAFields() {
  try {
    console.log('🔧 Corrigiendo campos MFA en tabla usuarios...');
    
    // 1. Verificar estructura actual
    const checkResult = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name IN ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes')
    `);
    
    console.log('📊 Campos MFA actuales:');
    checkResult.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 2. Corregir tipos de datos y valores por defecto
    console.log('🔄 Corrigiendo tipos de datos...');
    
    // Corregir mfa_enabled para que tenga valor por defecto FALSE
    await pool.query(`
      ALTER TABLE usuarios 
      ALTER COLUMN mfa_enabled SET DEFAULT false,
      ALTER COLUMN mfa_enabled SET NOT NULL
    `);
    console.log('✅ mfa_enabled corregido');

    // Corregir mfa_secret para que sea NULL por defecto
    await pool.query(`
      ALTER TABLE usuarios 
      ALTER COLUMN mfa_secret DROP NOT NULL
    `);
    console.log('✅ mfa_secret corregido');

    // Corregir mfa_backup_codes para que sea NULL por defecto
    await pool.query(`
      ALTER TABLE usuarios 
      ALTER COLUMN mfa_backup_codes DROP NOT NULL
    `);
    console.log('✅ mfa_backup_codes corregido');

    // 3. Actualizar todos los usuarios para que tengan mfa_enabled = false si es NULL
    await pool.query(`
      UPDATE usuarios 
      SET mfa_enabled = false 
      WHERE mfa_enabled IS NULL
    `);
    console.log('✅ Valores NULL actualizados a false');

    // 4. Verificar corrección
    const finalCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_usuarios,
        COUNT(mfa_enabled) as con_mfa_enabled,
        COUNT(mfa_secret) as con_mfa_secret,
        COUNT(mfa_backup_codes) as con_backup_codes
      FROM usuarios
    `);
    
    console.log('📊 Estado final:');
    console.log(`   - Total usuarios: ${finalCheck.rows[0].total_usuarios}`);
    console.log(`   - Con mfa_enabled: ${finalCheck.rows[0].con_mfa_enabled}`);
    console.log(`   - Con mfa_secret: ${finalCheck.rows[0].con_mfa_secret}`);
    console.log(`   - Con backup_codes: ${finalCheck.rows[0].con_backup_codes}`);

    console.log('🎉 Campos MFA corregidos exitosamente');

  } catch (error: any) {
    console.error('❌ Error corrigiendo campos MFA:', error.message);
  } finally {
    await pool.end();
  }
}

fixMFAFields();

// Backend/src/scripts/check-mfa-status.ts
import { pool } from '../config/database';

async function checkMFAStatus() {
  try {
    console.log('🔍 Verificando estado MFA de todos los usuarios...');
    
    const result = await pool.query(`
      SELECT 
        id,
        email,
        mfa_enabled,
        mfa_secret IS NOT NULL as has_secret,
        mfa_backup_codes IS NOT NULL as has_backup_codes,
        created_at
      FROM usuarios 
      ORDER BY id
    `);
    
    console.log('📊 Estado MFA de usuarios:');
    console.log('================================');
    
    result.rows.forEach((user: any) => {
      console.log(`👤 Usuario: ${user.email} (ID: ${user.id})`);
      console.log(`   - MFA Activado: ${user.mfa_enabled ? '✅ SI' : '❌ NO'}`);
      console.log(`   - Tiene secreto: ${user.has_secret ? '✅ SI' : '❌ NO'}`);
      console.log(`   - Tiene códigos: ${user.has_backup_codes ? '✅ SI' : '❌ NO'}`);
      console.log(`   - Creado: ${user.created_at}`);
      console.log('--------------------------------');
    });
    
    const total = result.rows.length;
    const withMFA = result.rows.filter((u: any) => u.mfa_enabled).length;
    
    console.log(`📈 Resumen:`);
    console.log(`   - Total usuarios: ${total}`);
    console.log(`   - Con MFA activado: ${withMFA}`);
    console.log(`   - Sin MFA: ${total - withMFA}`);
    
  } catch (error) {
    console.error('❌ Error verificando estado MFA:', error);
  } finally {
    await pool.end();
  }
}

checkMFAStatus();*/

// Backend/src/scripts/check-mfa-status.ts
import { pool } from '../config/database';

async function checkMFAStatus() {
  try {
    console.log('🔍 Verificando estado MFA de todos los usuarios...');
    
    const result = await pool.query(`
      SELECT 
        id,
        email,
        mfa_enabled,
        mfa_secret IS NOT NULL as has_secret,
        mfa_backup_codes IS NOT NULL as has_backup_codes,
        fecha_creacion
      FROM usuarios 
      ORDER BY id
    `);
    
    console.log('📊 Estado MFA de usuarios:');
    console.log('================================');
    
    result.rows.forEach((user: any) => {
      console.log(`👤 Usuario: ${user.email} (ID: ${user.id})`);
      console.log(`   - MFA Activado: ${user.mfa_enabled ? '✅ SI' : '❌ NO'}`);
      console.log(`   - Tiene secreto: ${user.has_secret ? '✅ SI' : '❌ NO'}`);
      console.log(`   - Tiene códigos: ${user.has_backup_codes ? '✅ SI' : '❌ NO'}`);
      console.log(`   - Creado: ${user.fecha_creacion}`);
      console.log('--------------------------------');
    });
    
    const total = result.rows.length;
    const withMFA = result.rows.filter((u: any) => u.mfa_enabled).length;
    
    console.log(`📈 Resumen:`);
    console.log(`   - Total usuarios: ${total}`);
    console.log(`   - Con MFA activado: ${withMFA}`);
    console.log(`   - Sin MFA: ${total - withMFA}`);
    
  } catch (error) {
    console.error('❌ Error verificando estado MFA:', error);
  } finally {
    await pool.end();
  }
}

checkMFAStatus();