// Ruta: Joyeria-Diana-Laura/Backend/src/scripts/create-login-security-table.ts
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const createLoginSecurityTable = async () => {
  console.log('🔧 Iniciando creación de tabla de seguridad...');
  
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

    // Crear tabla de intentos de login
    console.log('🏗️ Creando tabla login_attempts...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT false,
        failure_reason VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla login_attempts creada');

    // Crear tabla de bloqueos
    console.log('🏗️ Creando tabla account_locks...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_locks (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        attempt_count INTEGER DEFAULT 1,
        locked_until TIMESTAMP NOT NULL,
        lock_reason VARCHAR(100) DEFAULT 'too_many_attempts',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla account_locks creada');

    // Crear índices
    console.log('📊 Creando índices...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempt_time)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_account_locks_email ON account_locks(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_account_locks_locked_until ON account_locks(locked_until)');
    console.log('✅ Índices creados');

    console.log('🎉 ¡TABLAS DE SEGURIDAD CREADAS EXITOSAMENTE!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('🔍 Código de error:', error.code);
  } finally {
    await client.end();
    console.log('🔒 Conexión cerrada');
  }
};

createLoginSecurityTable();