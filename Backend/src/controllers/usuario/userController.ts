import { Request, Response } from 'express';
import * as userModel from '../../models/userModel';
import bcrypt from 'bcryptjs';

// Obtener perfil de usuario por ID
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await userModel.getUserById(Number.parseInt(id));
    
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
    const userId = Number.parseInt(id);
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

// Obtener perfil propio (sin requerir admin)
export const getOwnProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const user = await userModel.getUserById(Number(userId));
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const { password_hash, codigo_activacion_hash, ...safe } = user as any;
    res.json({ success: true, data: safe });
  } catch (error) {
    console.error('Error en getOwnProfile:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Actualizar perfil propio — cliente puede editar nombre y telefono (no email)
export const updateOwnProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { nombre, telefono, foto_perfil_url } = req.body;
    if (!nombre && telefono === undefined && foto_perfil_url === undefined) {
      return res.status(400).json({ success: false, message: 'Sin campos para actualizar' });
    }

    const ok = await userModel.updateUser(Number(userId), { nombre, telefono, foto_perfil_url });
    if (ok) res.json({ success: true, message: 'Perfil actualizado correctamente' });
    else res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  } catch (error) {
    console.error('Error en updateOwnProfile:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Cambiar contraseña propia (verificando la actual)
export const changeOwnPassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { passwordActual, passwordNueva } = req.body;
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ success: false, message: 'Se requieren la contraseña actual y la nueva' });
    }
    if (passwordNueva.length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const user = await userModel.getUserById(Number(userId));
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const valida = await bcrypt.compare(passwordActual, (user as any).password_hash);
    if (!valida) return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta' });

    await userModel.updatePassword(Number(userId), passwordNueva);
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en changeOwnPassword:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Cambiar email propio — solo admin, requiere confirmar contraseña
export const changeOwnEmail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const userRol = (req as any).user?.rol || '';
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });
    if (userRol !== 'admin') return res.status(403).json({ success: false, message: 'Solo el administrador puede cambiar su email' });

    const { emailNuevo, passwordConfirm } = req.body;
    if (!emailNuevo?.trim() || !passwordConfirm) {
      return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNuevo.trim())) {
      return res.status(400).json({ success: false, message: 'El email no tiene un formato válido' });
    }

    const user = await userModel.getUserById(Number(userId));
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const valida = await bcrypt.compare(passwordConfirm, (user as any).password_hash);
    if (!valida) return res.status(400).json({ success: false, message: 'La contraseña es incorrecta' });

    // Verificar que el nuevo email no esté en uso
    const existente = await userModel.getUserByEmail(emailNuevo.trim().toLowerCase());
    if (existente && (existente as any).id !== Number(userId)) {
      return res.status(409).json({ success: false, message: 'Ese email ya está en uso por otra cuenta' });
    }

    const ok = await userModel.updateUser(Number(userId), { email: emailNuevo.trim().toLowerCase() });
    if (ok) res.json({ success: true, message: 'Email actualizado correctamente' });
    else res.status(500).json({ success: false, message: 'Error al actualizar el email' });
  } catch (error) {
    console.error('Error en changeOwnEmail:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Eliminar usuario (soft delete)
export const deleteUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const success = await userModel.deleteUser(Number.parseInt(id));
    
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

const generarCodigo = (longitud: number, solo_numeros = false): string => {
  const chars = solo_numeros ? '0123456789' : 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < longitud; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return codigo;
};

export const createWorkerAccount = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, puesto } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const tempUid = `worker_${Date.now()}`;

    // Generar código de activación único (8 chars) — mostrar al admin, guardar hasheado
    const codigoActivacion = generarCodigo(8);
    const codigoActivacionHash = await bcrypt.hash(codigoActivacion, 10);

    const result = await userModel.createWorker({
      nombre,
      email,
      password_hash: hashedPassword,
      firebase_uid: tempUid,
      rol: puesto,
      activado: false,
      codigo_activacion_hash: codigoActivacionHash,
    });

    if (result) {
      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: {
          codigoActivacion, // mostrar SOLO esta vez al admin
          nombre,
          email,
        }
      });
    }
  } catch (error) {
    console.error('Error en createWorkerAccount:', error);
    res.status(500).json({ success: false, message: 'Error al registrar en la base de datos' });
  }
};