import { Request, Response } from 'express';
import * as userModel from '../models/userModel';
import admin from '../config/firebase';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, nombre } = req.body;

    if (!email || !password || !nombre) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const exists = await userModel.emailExists(email);
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Crear usuario en Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre
    });

    // Crear usuario en la base de datos local
    const success = await userModel.createUser(email, password, nombre, userRecord.uid);
    
    if (success) {
      res.status(201).json({
        success: true,
        message: 'Usuario registrado correctamente'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al registrar usuario'
      });
    }
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    const user = await userModel.verifyUser(email, password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre
        }
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

import crypto from 'crypto';

// Función para "Olvidé contraseña"
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido'
      });
    }

    // 1. Verificar si el usuario existe
    const exists = await userModel.emailExists(email);
    if (!exists) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({
        success: true,
        message: 'Si el email existe, se ha enviado un enlace de recuperación'
      });
    }

    // 2. Generar token único
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    // 3. Guardar token en la base de datos
    const tokenSaved = await userModel.setPasswordResetToken(email, resetToken, resetTokenExpiry);
    
    if (!tokenSaved) {
      return res.status(500).json({
        success: false,
        message: 'Error al generar token de recuperación'
      });
    }

    // 4. En desarrollo: mostrar el token en consola
    console.log('🔐 Token de recuperación para', email, ':', resetToken);
    console.log('🔗 Enlace de recuperación:', `http://localhost:3000/reset-password?token=${resetToken}`);

    res.json({
      success: true,
      message: 'Si el email existe, se ha enviado un enlace de recuperación',
      // Solo para desarrollo
      debug: {
        resetToken,
        resetLink: `http://localhost:3000/reset-password?token=${resetToken}`
      }
    });

  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función para resetear contraseña
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token y nueva contraseña son requeridos'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // 1. Buscar usuario con token válido
    const user = await userModel.getUserByResetToken(token);
    if (!user || !user.id) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // 2. Actualizar contraseña
    const success = await userModel.updatePassword(user.id, newPassword);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar la contraseña'
      });
    }

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función para verificar token (opcional)
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const user = await userModel.getUserByResetToken(token);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    res.json({
      success: true,
      message: 'Token válido'
    });

  } catch (error) {
    console.error('Error en verifyResetToken:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};