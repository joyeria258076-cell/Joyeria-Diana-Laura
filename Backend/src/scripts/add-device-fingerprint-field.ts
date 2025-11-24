// Ruta: Joyeria-Diana-Laura/Backend/src/scripts/add-device-fingerprint-field.ts
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function addDeviceFingerprintField() {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('🔄 Conectado a la base de datos...');

    // Agregar columna device_fingerprint si no existe
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='user_sessions' AND column_name='device_fingerprint') THEN
          ALTER TABLE user_sessions ADD COLUMN device_fingerprint VARCHAR(16);
        END IF;
      END $$;
    `);

    console.log('✅ Columna device_fingerprint verificada/agregada correctamente');

    // Crear índice para mejor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_fingerprint 
      ON user_sessions(device_fingerprint);
    `);

    console.log('✅ Índice device_fingerprint creado/verificado');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

addDeviceFingerprintField();