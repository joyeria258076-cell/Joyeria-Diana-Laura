import { pool } from '../config/database';

async function fixMFASecretLength() {
  try {
    console.log('🔄 Ampliando campo mfa_secret a VARCHAR(64)...');
    
    await pool.query(`
      ALTER TABLE usuarios 
      ALTER COLUMN mfa_secret TYPE VARCHAR(64)
    `);
    
    console.log('✅ Campo mfa_secret ampliado exitosamente');
    
  } catch (error) {
    console.error('❌ Error ampliando campo mfa_secret:', error);
  } finally {
    await pool.end();
  }
}

fixMFASecretLength();