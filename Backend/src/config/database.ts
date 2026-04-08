// Backend/src/config/database.ts
import { Pool, types } from 'pg';
import dotenv from 'dotenv';

// ✅ Evitar que pg convierta timestamps automáticamente a hora local
types.setTypeParser(1114, (str: string) => str); // timestamp without timezone
types.setTypeParser(1184, (str: string) => str); // timestamp with timezone

dotenv.config();

// Configuración para Supabase
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    };
  }

  return {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number.parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
};

// Creamos el pool
const pool = new Pool(getDatabaseConfig());

// ─── FIX TIMEZONE: forzar UTC en cada conexión del pool ──────────────────────
// Evita que el driver pg convierta fechas a la timezone local del servidor
// (problema en local con UTC-6 y en Render con cualquier offset)
pool.on('connect', (client) => {
  client.query("SET timezone = 'UTC'").catch((err) => {
    console.error('❌ Error estableciendo timezone UTC:', err.message);
  });
});
// ─────────────────────────────────────────────────────────────────────────────

// Función para probar la conexión
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL en Supabase');
    
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

// ✅ EXPORTACIÓN CORREGIDA - exportamos el pool como default
export default pool;

// También exportamos como named export para compatibilidad
export { pool };