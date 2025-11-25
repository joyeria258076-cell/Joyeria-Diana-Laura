import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function addMFAFields() {
  try {
    console.log('🔄 Agregando campos MFA a la tabla usuarios...');
    
    const migrationSQL = `
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(32),
      ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[];
    `;
    
    await pool.query(migrationSQL);
    console.log('✅ Campos MFA agregados exitosamente');
    
  } catch (error) {
    console.error('❌ Error agregando campos MFA:', error);
  } finally {
    await pool.end();
  }
}

addMFAFields();