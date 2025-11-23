// Ruta: Joyeria-Diana-Laura/Backend/src/scripts/create-login-security-table.ts
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const createLoginSecurityTable = async () => {
  console.log('🔧 Verificando/Creando tabla login_security...');
  
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Crear tabla login_security
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_security (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        login_attempts INTEGER DEFAULT 0,
        last_login_attempt TIMESTAMP,
        login_blocked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla login_security verificada/creada');

    // Crear índices
    await client.query('CREATE INDEX IF NOT EXISTS idx_login_security_email ON login_security(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_login_security_blocked ON login_security(login_blocked_until)');
    console.log('✅ Índices creados');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
};

createLoginSecurityTable();