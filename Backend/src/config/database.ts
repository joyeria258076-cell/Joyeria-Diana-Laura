// Ruta: Joyeria-Diana-Laura/Backend/src/config/database.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración para Supabase
const getDatabaseConfig = () => {
  // Opción 1: Usar la URL completa (Recomendado para Supabase)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Supabase requiere SSL
      max: 10, // Número máximo de clientes en el pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    };
  }

  // Opción 2: Configuración manual por variables individuales
  return {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
};

export const pool = new Pool(getDatabaseConfig());

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL en Supabase');
    
    // Verificar conexión básica y hora del servidor
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Hora del servidor Supabase:', result.rows[0].current_time);
    
    // Verificar si la tabla 'usuarios' existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      )
    `);
    
    const existeTabla = tableCheck.rows[0].exists;
    console.log('📊 Tabla usuarios existe:', existeTabla);
    
    if (existeTabla) {
      const userCount = await client.query('SELECT COUNT(*) as count FROM usuarios');
      console.log('👥 Usuarios en la BD:', userCount.rows[0].count);
    } else {
      console.log('⚠️  La tabla usuarios NO existe en Supabase todavía');
    }
    
    client.release();
    return true;
  } catch (error: any) {
    console.error('❌ Error conectando a Supabase:', error.message);
    console.log('🔍 Detalles de conexión intentados:');
    console.log('   Host:', process.env.DB_HOST);
    console.log('   Base de datos:', process.env.DB_NAME);
    return false;
  }
};