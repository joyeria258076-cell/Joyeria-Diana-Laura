// Backend/src/scripts/add-last-activity-field.ts
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function addLastActivityField() {
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

    // Agregar columna last_activity si no existe
    const result = await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='usuarios' AND column_name='last_activity') THEN
          ALTER TABLE usuarios ADD COLUMN last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);

    console.log('✅ Columna last_activity verificada/agregada correctamente');

    // Crear índice para mejor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_last_activity 
      ON usuarios(last_activity) WHERE activo = true;
    `);

    console.log('✅ Índice creado/verificado correctamente');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

addLastActivityField();