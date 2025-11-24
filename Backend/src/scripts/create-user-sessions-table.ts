// Ruta: Joyeria-Diana-Laura/Backend/src/scripts/create-user-sessions-table.ts
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const createUserSessionsTable = async () => {
  console.log('🔧 Verificando/Creando tabla user_sessions...');
  
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

    // Crear tabla user_sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES usuarios(id),
        session_token VARCHAR(500) UNIQUE NOT NULL,
        firebase_uid VARCHAR(255),
        device_name VARCHAR(255),
        browser VARCHAR(100),
        os VARCHAR(100),
        ip_address VARCHAR(45),
        user_agent TEXT,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_revoked BOOLEAN DEFAULT FALSE,
        revoked_at TIMESTAMP
      )
    `);
    console.log('✅ Tabla user_sessions verificada/creada');

    // Crear índices para mejor performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_firebase_uid ON user_sessions(firebase_uid)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_is_revoked ON user_sessions(is_revoked)');
    console.log('✅ Índices creados/verificados');

    console.log('🎯 Tabla user_sessions lista para gestión de sesiones activas');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
};

createUserSessionsTable();