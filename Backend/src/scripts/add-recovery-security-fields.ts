import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const addRecoverySecurityFields = async () => {
  console.log('🔄 Iniciando migración para campos de seguridad de recuperación...');
  
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { 
      rejectUnauthorized: false 
    },
    connectionTimeoutMillis: 30000,
  });

  try {
    console.log('🔄 Conectando a Railway...');
    await client.connect();
    console.log('✅ ¡Conectado a PostgreSQL!');

    // Verificar si la tabla usuarios existe
    console.log('🔍 Verificando si la tabla usuarios existe...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ La tabla usuarios no existe. No se pueden agregar campos.');
      return;
    }
    
    console.log('✅ Tabla usuarios encontrada');
    
    // Agregar campos de seguridad para recuperación
    console.log('📝 Agregando campos de seguridad...');
    
    // Campo para contar intentos de recuperación
    await client.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS recovery_attempts INTEGER DEFAULT 0
    `);
    console.log('✅ Campo recovery_attempts agregado');
    
    // Campo para timestamp del último intento
    await client.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS last_recovery_attempt TIMESTAMP
    `);
    console.log('✅ Campo last_recovery_attempt agregado');
    
    // Campo para bloqueo temporal
    await client.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS recovery_blocked_until TIMESTAMP
    `);
    console.log('✅ Campo recovery_blocked_until agregado');
    
    // Crear índices para mejor performance
    console.log('📊 Creando índices...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_recovery_blocked 
      ON usuarios(recovery_blocked_until)
    `);
    console.log('✅ Índice idx_usuarios_recovery_blocked creado');
    
    console.log('🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');

  } catch (error: any) {
    console.error('❌ Error en migración:', error.message);
    
    if (error.code === '42701') {
      console.log('ℹ️ Los campos ya existen');
    } else if (error.code === '42P07') {
      console.log('ℹ️ El índice ya existe');
    } else {
      console.log('🔍 Código de error:', error.code);
      console.log('💡 Posibles soluciones:');
      console.log('   - Verifica tu conexión a internet');
      console.log('   - Verifica las credenciales en .env');
      console.log('   - Revisa que Railway esté activo');
    }
  } finally {
    await client.end();
    console.log('🔒 Conexión cerrada');
  }
};

addRecoverySecurityFields();