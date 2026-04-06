// Ruta: Joyeria-Diana-Laura/Backend/src/models/userModel.ts
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id?: number;
  firebase_uid: string;
  email: string;
  password_hash: string;
  nombre?: string;
  activo?: boolean;
  fecha_creacion?: Date;
  fecha_actualizacion?: Date;
  reset_password_token?: string;
  reset_password_expires?: Date;
  rol?: 'admin' | 'trabajador' | 'cliente';
}

export const createUser = async (email: string, password: string, nombre: string, firebase_uid: string): Promise<boolean> => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'INSERT INTO seguridad.usuarios (email, password_hash, nombre, firebase_uid) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, hashedPassword, nombre, firebase_uid]
    );
    
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('Error creando usuario:', error);
    return false;
  }
};

export const verifyUser = async (email: string, password: string): Promise<User | null> => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'SELECT * FROM seguridad.usuarios WHERE email = $1 AND activo = true',
      [email]
    );
    
    if (result.rows.length === 0) return null;
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    return isValid ? user : null;
  } catch (error) {
    console.error('Error en login:', error);
    return null;
  }
};

export const emailExists = async (email: string): Promise<boolean> => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'SELECT id FROM seguridad.usuarios WHERE email = $1 AND activo = true',
      [email]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error en emailExists:', error);
    return false;
  }
};

// Obtener usuario por ID
export const getUserById = async (id: number): Promise<User | null> => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'SELECT id, email, nombre, rol, activo, fecha_creacion, fecha_actualizacion FROM seguridad.usuarios WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error obteniendo usuario por ID:', error);
    return null;
  }
};

// Obtener todos los usuarios
export const getAllUsers = async (): Promise<User[]> => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'SELECT id, firebase_uid, email, nombre, rol, activo, fecha_creacion, fecha_actualizacion FROM seguridad.usuarios ORDER BY activo DESC, nombre ASC'
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return [];
  }
};

// Actualizar usuario
export const updateUser = async (id: number, updates: { nombre?: string; email?: string }): Promise<boolean> => {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.nombre) {
      fields.push(`nombre = $${paramCount}`);
      values.push(updates.nombre);
      paramCount++;
    }
    
    if (updates.email) {
      fields.push(`email = $${paramCount}`);
      values.push(updates.email);
      paramCount++;
    }
    
    if (fields.length === 0) {
      return false;
    }
    
    values.push(id);
    
    // ✅ CORREGIDO: especificar esquema seguridad
    const query = `UPDATE seguridad.usuarios SET ${fields.join(', ')} WHERE id = $${paramCount}`;
    const result = await pool.query(query, values);
    
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return false;
  }
};

// Eliminar usuario (soft delete)
export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'UPDATE seguridad.usuarios SET activo = false WHERE id = $1',
      [id]
    );
    
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return false;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'SELECT * FROM seguridad.usuarios WHERE email = $1 AND activo = true',
      [email]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error obteniendo usuario por email:', error);
    return null;
  }
};

export const updatePassword = async (userId: number, newPassword: string): Promise<boolean> => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'UPDATE seguridad.usuarios SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );
    
    console.log(`✅ Contraseña actualizada para usuario ID: ${userId}`);
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('❌ Error updating password:', error);
    return false;
  }
};

// Actualizar timestamp de última actividad
export const updateUserActivity = async (email: string): Promise<boolean> => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'UPDATE seguridad.usuarios SET last_activity = CURRENT_TIMESTAMP WHERE email = $1',
      [email]
    );
    
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('Error actualizando actividad:', error);
    return false;
  }
};

// Obtener usuario por email con last_activity
export const getUserByEmailWithActivity = async (email: string): Promise<(User & { last_activity: Date }) | null> => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      'SELECT *, last_activity FROM seguridad.usuarios WHERE email = $1 AND activo = true',
      [email]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error obteniendo usuario con actividad:', error);
    return null;
  }
};

// Verificar si usuario está inactivo
export const isUserInactive = async (email: string, maxInactivityMinutes: number = 15): Promise<boolean> => {
  try {
    const user = await getUserByEmailWithActivity(email);
    if (!user || !user.last_activity) return true;

    const lastActivity = new Date(user.last_activity).getTime();
    const now = new Date().getTime();
    const inactivityTime = now - lastActivity;
    const maxInactivityMs = maxInactivityMinutes * 60 * 1000;

    return inactivityTime > maxInactivityMs;
  } catch (error) {
    console.error('Error verificando inactividad:', error);
    return true;
  }
};

// Función para crear trabajadores con datos extendidos
export const createWorker = async (userData: {
  email: string;
  password_hash: string;
  nombre: string;
  firebase_uid: string;
  rol: string;
}): Promise<boolean> => {
  try {
    const { email, password_hash, nombre, firebase_uid, rol } = userData;
    
    // ✅ CORREGIDO: especificar esquema seguridad
    const result = await pool.query(
      `INSERT INTO seguridad.usuarios (email, password_hash, nombre, firebase_uid, rol, activo) 
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
      [email, password_hash, nombre, firebase_uid, rol]
    );
    
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('Error en createWorker (Model):', error);
    throw error; 
  }
};

export const getAvailableRoles = async () => {
  try {
    const query = `SELECT unnest(enum_range(NULL::rol_enum))::text AS rol`;
    const result = await pool.query(query); 
    
    const todosLosRoles = result.rows.map((row: any) => row.rol);
    const rolesExcluidos = ['cliente'];
    const rolesOperacion = todosLosRoles.filter(
      (rol: string) => !rolesExcluidos.includes(rol)
    );
    
    return rolesOperacion;
    
  } catch (error) {
    console.error('Error obteniendo rol_enum en userModel:', error);
    throw error;
  }
};

// Buscar un trabajador por ID para obtener su firebase_uid
export const getWorkerById = async (id: number) => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const query = `SELECT id, firebase_uid, activo, nombre, email, rol FROM seguridad.usuarios WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0]; 
  } catch (error) {
    console.error('Error al buscar trabajador por ID:', error);
    throw error;
  }
};

// Cambiar el estado activo/inactivo en PostgreSQL
export const toggleWorkerStatus = async (id: number, activo: boolean) => {
  try {
    // ✅ CORREGIDO: especificar esquema seguridad
    const query = `UPDATE seguridad.usuarios SET activo = $1 WHERE id = $2`;
    await pool.query(query, [activo, id]);
    return true;
  } catch (error) {
    console.error('Error al cambiar estado del trabajador:', error);
    throw error;
  }
};

// Actualiza el nombre y el rol de un trabajador en PostgreSQL
export const updateWorkerInfo = async (id: number, nombre: string, rol: string, email: string) => {
  // ✅ CORREGIDO: especificar esquema seguridad
  const query = `
    UPDATE seguridad.usuarios 
    SET nombre = $1, rol = $2, email = $3 
    WHERE id = $4 
    RETURNING id, nombre, email, rol, activo`;
    
  const values = [nombre, rol, email, id];
  const { rows } = await pool.query(query, values);
  return rows[0];
};