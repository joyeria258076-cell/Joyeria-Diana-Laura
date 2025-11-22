// Ruta: Joyeria-Diana-Laura/Backend/src/scripts/security-cleanup.ts
import { LoginSecurityService } from '../services/loginSecurityService';
import { pool } from '../config/database';

const runSecurityCleanup = async () => {
  console.log('🧹 Iniciando limpieza de registros de seguridad...');
  
  try {
    await LoginSecurityService.cleanupOldRecords();
    console.log('✅ Limpieza completada exitosamente');
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  } finally {
    await pool.end();
  }
};

// Ejecutar limpieza
runSecurityCleanup();