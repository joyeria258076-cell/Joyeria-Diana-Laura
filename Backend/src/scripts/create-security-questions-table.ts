// Ruta: Joyeria-Diana-Laura/Backend/src/scripts/create-security-questions-table.ts
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const createSecurityQuestionsTable = async () => {
  console.log('🔧 Verificando/Creando tabla security_questions...');
  
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

    // 🗑️ ELIMINAR tabla account_locks si existe (no se usa)
    try {
      await client.query('DROP TABLE IF EXISTS account_locks');
      console.log('✅ Tabla account_locks eliminada (no se utilizaba)');
    } catch (dropError) {
      console.log('ℹ️ Tabla account_locks no existía o no se pudo eliminar');
    }

    // 🆕 CREAR tabla security_questions
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_questions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        question_text VARCHAR(500) NOT NULL,
        answer_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id) -- Un usuario solo puede tener una pregunta secreta
      )
    `);
    console.log('✅ Tabla security_questions verificada/creada');

    // Crear índices para mejor performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_security_questions_user_id ON security_questions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_security_questions_question ON security_questions(question_text)');
    console.log('✅ Índices creados');

    console.log('🎯 Tabla security_questions lista para preguntas secretas seguras');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
};

createSecurityQuestionsTable();