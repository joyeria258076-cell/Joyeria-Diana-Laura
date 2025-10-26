import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id?: number;
  email: string;
  password_hash: string;
  nombre?: string;
  fecha_creacion?: Date;
}

export const createUser = async (email: string, password: string, nombre: string): Promise<boolean> => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result]: any = await pool.execute(
      'INSERT INTO usuarios (email, password_hash, nombre) VALUES (?, ?, ?)',
      [email, hashedPassword, nombre]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error creando usuario:', error);
    return false;
  }
};

export const verifyUser = async (email: string, password: string): Promise<User | null> => {
  try {
    const [rows]: any = await pool.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) return null;
    
    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    return isValid ? user : null;
  } catch (error) {
    console.error('Error en login:', error);
    return null;
  }
};

export const emailExists = async (email: string): Promise<boolean> => {
  try {
    const [rows]: any = await pool.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );
    return rows.length > 0;
  } catch (error) {
    return false;
  }
};

// Agrega estas funciones al final de tu userModel.ts actual

// Obtener usuario por ID
export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const [rows]: any = await pool.execute(
      'SELECT id, email, nombre, activo, fecha_creacion, fecha_actualizacion FROM usuarios WHERE id = ? AND activo = 1',
      [id]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error obteniendo usuario por ID:', error);
    return null;
  }
};

// Obtener todos los usuarios
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const [rows]: any = await pool.execute(
      'SELECT id, email, nombre, activo, fecha_creacion, fecha_actualizacion FROM usuarios WHERE activo = 1'
    );
    
    return rows;
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
    
    if (updates.nombre) {
      fields.push('nombre = ?');
      values.push(updates.nombre);
    }
    
    if (updates.email) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    
    if (fields.length === 0) {
      return false;
    }
    
    values.push(id);
    
    const [result]: any = await pool.execute(
      `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return false;
  }
};

// Eliminar usuario (soft delete)
export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    const [result]: any = await pool.execute(
      'UPDATE usuarios SET activo = 0 WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return false;
  }
};

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
};

export const updatePassword = async (userId: number, newPassword: string): Promise<boolean> => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const [result]: any = await pool.execute(
      'UPDATE usuarios SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
      [hashedPassword, userId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating password:', error);
    return false;
  }
};