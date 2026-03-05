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
    
    const result = await pool.query(
      'INSERT INTO usuarios (email, password_hash, nombre, firebase_uid) VALUES ($1, $2, $3, $4) RETURNING id',
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
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
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
    const result = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1 AND activo = true',
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
    const result = await pool.query(
      'SELECT id, email, nombre, activo, fecha_creacion, fecha_actualizacion FROM usuarios WHERE id = $1 AND activo = true',
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
    // QUITAMOS el "WHERE activo = true" para que el Admin vea a TODOS
    // Ordenamos por activo para que los vigentes salgan primero
  const result = await pool.query(
        'SELECT id, firebase_uid, email, nombre, rol, activo, fecha_creacion, fecha_actualizacion FROM usuarios ORDER BY activo DESC, nombre ASC'
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
    
    const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${paramCount}`;
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
    const result = await pool.query(
      'UPDATE usuarios SET activo = false WHERE id = $1',
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
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
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
    
    const result = await pool.query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );
    
    console.log(`✅ Contraseña actualizada para usuario ID: ${userId}`);
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('❌ Error updating password:', error);
    return false;
  }
};

/*
// Funciones para recuperación de contraseña
export const setPasswordResetToken = async (email: string, token: string, expires: Date): Promise<boolean> => {
  try {
    const [result]: any = await pool.execute(
      'UPDATE usuarios SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?',
      [token, expires, email]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error setting reset token:', error);
    return false;
  }
};

export const getUserByResetToken = async (token: string): Promise<User | null> => {
  try {
    const [rows]: any = await pool.execute(
      'SELECT * FROM usuarios WHERE reset_password_token = ? AND reset_password_expires > NOW()',
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting user by reset token:', error);
    return null;
  }
};*/

// 🎯 NUEVO: Actualizar timestamp de última actividad
export const updateUserActivity = async (email: string): Promise<boolean> => {
  try {
    const result = await pool.query(
      'UPDATE usuarios SET last_activity = CURRENT_TIMESTAMP WHERE email = $1',
      [email]
    );
    
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error('Error actualizando actividad:', error);
    return false;
  }
};

// 🎯 NUEVO: Obtener usuario por email con last_activity
export const getUserByEmailWithActivity = async (email: string): Promise<(User & { last_activity: Date }) | null> => {
  try {
    const result = await pool.query(
      'SELECT *, last_activity FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error obteniendo usuario con actividad:', error);
    return null;
  }
};

// 🎯 NUEVO: Verificar si usuario está inactivo
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
    return true; // Por seguridad, considerar inactivo si hay error
  }
};

// Función para crear trabajadores con datos extendidos
export const createWorker = async (userData: {
  email: string;
  password_hash: string;
  nombre: string;
  firebase_uid: string;
  rol: string; // Solo usaremos el rol
}): Promise<boolean> => {
  try {
    const { email, password_hash, nombre, firebase_uid, rol } = userData;
    
    // 🎯 Quitamos 'puesto' de la lista de columnas y de los valores ($)
    const result = await pool.query(
      `INSERT INTO usuarios (email, password_hash, nombre, firebase_uid, rol, activo) 
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
    
    // 1. Obtenemos todos los roles de la base de datos
    const todosLosRoles = result.rows.map((row: any) => row.rol);

    // 2. Definimos AQUÍ MISMOS los roles que NO deben aparecer en el panel
    // Puedes agregar más separándolos por comas, ej: ['cliente', 'invitado']
    const rolesExcluidos = ['cliente'];

    // 3. Filtramos: Dejamos solo los que NO estén en la lista de excluidos
    const rolesOperacion = todosLosRoles.filter(
      (rol: string) => !rolesExcluidos.includes(rol)
    );
    
    // 4. Devolvemos la lista limpia al Frontend
    return rolesOperacion;
    
  } catch (error) {
    console.error('Error obteniendo rol_enum en userModel:', error);
    throw error;
  }
};

// 1. Buscar un trabajador por ID para obtener su firebase_uid
export const getWorkerById = async (id: number) => {
  try {
    // QUITAMOS "AND activo = true" para poder encontrarlo y reactivarlo
    const query = `SELECT id, firebase_uid, activo, nombre, email, rol FROM usuarios WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0]; 
  } catch (error) {
    console.error('Error al buscar trabajador por ID:', error);
    throw error;
  }
};

// 2. Cambiar el estado activo/inactivo en PostgreSQL
export const toggleWorkerStatus = async (id: number, activo: boolean) => {
  try {
    const query = `UPDATE usuarios SET activo = $1 WHERE id = $2`;
    await pool.query(query, [activo, id]);
    return true;
  } catch (error) {
    console.error('Error al cambiar estado del trabajador:', error);
    throw error;
  }
};