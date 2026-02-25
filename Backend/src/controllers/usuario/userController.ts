import { Request, Response } from 'express';
import * as userModel from '../../models/userModel';
import bcrypt from 'bcryptjs';

// Obtener perfil de usuario por ID
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await userModel.getUserById(parseInt(id));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // No devolver el password_hash por seguridad
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error en getUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar perfil de usuario
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, email } = req.body;
    
    if (!nombre && !email) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un campo para actualizar'
      });
    }
    
    // Validar que id sea número válido
    const userId = parseInt(id);
    if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
    }

    // Nota: Asegúrate de que tu userModel tenga la función updateUser aceptando estos parámetros
    const success = await userModel.updateUser(userId, { nombre, email });
    
    if (success) {
      res.json({
        success: true,
        message: 'Perfil actualizado correctamente'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o sin cambios'
      });
    }
  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Eliminar usuario (soft delete)
export const deleteUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await userModel.deleteUser(parseInt(id));
    
    if (success) {
      res.json({
        success: true,
        message: 'Usuario eliminado correctamente'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
  } catch (error) {
    console.error('Error en deleteUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener todos los usuarios (solo para administradores)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await userModel.getAllUsers();
    
    // IMPORTANTE: Asegúrate de que el mapeo incluya el 'rol'
    const usersWithRoles = users.map((user: any) => {
      const { password_hash, ...userFields } = user;
      return userFields; // Esto debe incluir id, nombre, email, ROL, etc.
    });

    res.json({
      success: true,
      data: usersWithRoles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
  }
};

export const createWorkerAccount = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, puesto } = req.body; // 'puesto' trae el valor del select

    const hashedPassword = await bcrypt.hash(password, 10);
    const tempUid = `worker_${Date.now()}`;

    const success = await userModel.createWorker({
      nombre,
      email,
      password_hash: hashedPassword,
      firebase_uid: tempUid,
      rol: puesto // 🎯 Aquí asignamos lo que el admin eligió al campo 'rol' de la BD
    });

    if (success) {
      res.status(201).json({ success: true, message: 'Usuario creado exitosamente' });
    }
  } catch (error) {
    console.error('Error en createWorkerAccount:', error);
    res.status(500).json({ success: false, message: 'Error al registrar en la base de datos' });
  }
};