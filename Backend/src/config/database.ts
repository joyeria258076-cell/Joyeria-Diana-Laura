// Backend/src/config/database.ts
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuración base
const baseConfig: PoolConfig = {
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
};

// Configuración para múltiples roles (con los usuarios creados en BD)
const getPoolForRole = (role: string): Pool => {
  let connectionString: string | undefined;

  switch (role) {
    case 'admin':
      connectionString = process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL;
      break;
    case 'trabajador':
      connectionString = process.env.DATABASE_URL_MANAGER || process.env.DATABASE_URL;
      break;
    case 'cliente':
      connectionString = process.env.DATABASE_URL_APP || process.env.DATABASE_URL;
      break;
    case 'visitante':
      connectionString = process.env.DATABASE_URL_READONLY || process.env.DATABASE_URL;
      break;
    case 'sistema':
      connectionString = process.env.DATABASE_URL_SYSTEM || process.env.DATABASE_URL;
      break;
    default:
      connectionString = process.env.DATABASE_URL_APP || process.env.DATABASE_URL;
      break;
  }

  return new Pool({
    ...baseConfig,
    connectionString,
  });
};

// Pool principal (compatibilidad con código existente)
const pool = new Pool({
  ...baseConfig,
  connectionString: process.env.DATABASE_URL,
});

// Pools por rol (lazy initialization)
let adminPool: Pool | null = null;
let trabajadorPool: Pool | null = null;
let clientePool: Pool | null = null;
let visitantePool: Pool | null = null;
let sistemaPool: Pool | null = null;

export const getPoolByRole = (role: string): Pool => {
  switch (role) {
    case 'admin':
      if (!adminPool) adminPool = getPoolForRole('admin');
      return adminPool;
    case 'trabajador':
      if (!trabajadorPool) trabajadorPool = getPoolForRole('trabajador');
      return trabajadorPool;
    case 'cliente':
      if (!clientePool) clientePool = getPoolForRole('cliente');
      return clientePool;
    case 'visitante':
      if (!visitantePool) visitantePool = getPoolForRole('visitante');
      return visitantePool;
    case 'sistema':
      if (!sistemaPool) sistemaPool = getPoolForRole('sistema');
      return sistemaPool;
    default:
      if (!clientePool) clientePool = getPoolForRole('cliente');
      return clientePool;
  }
};

// Configuración de timezone UTC en cada conexión
const setupTimezone = (client: any) => {
  client.query("SET timezone = 'UTC'").catch((err: Error) => {
    console.error('❌ Error estableciendo timezone UTC:', err.message);
  });
};

pool.on('connect', setupTimezone);

// Función para probar conexión principal
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL en Neon');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Hora del servidor:', result.rows[0].current_time);
    
    // Verificar tablas en esquema seguridad
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'seguridad' 
        AND table_name = 'usuarios'
      )
    `);
    
    console.log('📊 Tabla usuarios existe en esquema seguridad:', tableCheck.rows[0].exists);
    
    client.release();
    return true;
  } catch (error: any) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
};

// Función para probar conexiones por rol
export const testRoleConnections = async (): Promise<Record<string, boolean>> => {
  const results: Record<string, boolean> = {};
  const roles = ['admin', 'trabajador', 'cliente', 'visitante', 'sistema'];
  
  for (const role of roles) {
    try {
      const testPool = getPoolByRole(role);
      const client = await testPool.connect();
      await client.query('SELECT 1');
      client.release();
      results[role] = true;
      console.log(`✅ Conexión ${role} OK`);
    } catch (error) {
      results[role] = false;
      console.log(`❌ Conexión ${role} falló`);
    }
  }
  
  return results;
};

// Exportaciones principales
export default pool;
export { pool };

// Exportar pools por rol
export const getAdminPool = () => getPoolByRole('admin');
export const getTrabajadorPool = () => getPoolByRole('trabajador');
export const getClientePool = () => getPoolByRole('cliente');
export const getVisitantePool = () => getPoolByRole('visitante');
export const getSistemaPool = () => getPoolByRole('sistema');