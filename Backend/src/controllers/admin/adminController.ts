// Ruta: Backend/src/controllers/admin/adminController.ts
import { Request, Response } from 'express';
import admin from '../../config/firebase'; 
import * as userModel from '../../models/userModel';
import bcrypt from 'bcryptjs';

/**
 * Registra un nuevo trabajador tanto en Firebase Auth como en la Base de Datos local.
 */
export const createWorkerAccount = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, puesto } = req.body;

    // 1. Validación de entrada
    if (!nombre || !email || !password || !puesto) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los campos son obligatorios (nombre, email, password, puesto)' 
      });
    }

    console.log(`[Admin] Iniciando proceso de alta para: ${email}`);

    // 2. Crear el usuario en Firebase Authentication
    // Esto genera el UID real necesario para el Login
    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
      emailVerified: true, // Se marca verificado porque lo crea un administrador
    });

    console.log(`[Firebase] Usuario creado exitosamente. UID: ${firebaseUser.uid}`);

    // 3. Encriptar contraseña para la base de datos de PostgreSQL (Seguridad redundante)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Guardar en PostgreSQL
    const success = await userModel.createWorker({
      nombre,
      email,
      password_hash: hashedPassword,
      firebase_uid: firebaseUser.uid, // Guardamos el UID REAL de Firebase
      rol: puesto
    });

    if (success) {
      return res.status(201).json({ 
        success: true, 
        message: 'Trabajador registrado correctamente en Firebase y Base de Datos' 
      });
    } else {
      // Si la DB falla, revertimos el cambio en Firebase para no dejar cuentas huérfanas
      await admin.auth().deleteUser(firebaseUser.uid);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al sincronizar con la base de datos local' 
      });
    }

  } catch (error: any) {
    console.error('❌ Error en adminController (createWorkerAccount):', error);
    
    // Manejo de errores específicos de Firebase Admin SDK
    let errorMsg = 'Error interno del servidor al crear el usuario';
    
    if (error.code === 'auth/email-already-exists') {
      errorMsg = 'Este correo electrónico ya está registrado en Firebase.';
    } else if (error.code === 'auth/invalid-password') {
      errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
    }

    res.status(500).json({ 
      success: false, 
      message: errorMsg,
      details: error.message 
    });
  }
};

export const getRoles = async (req: Request, res: Response) => {
  try {
    // Llamamos a la función que acabas de crear en el userModel
    const roles = await userModel.getAvailableRoles();
    
    // Devolvemos el arreglo puro para que el Frontend lo lea en el select
    res.status(200).json(roles);
  } catch (error: any) {
    console.error('❌ Error en adminController (getRoles):', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor al obtener los roles' 
    });
  }
};

/**
 * Activa o Desactiva a un trabajador en BD y Firebase
 */
export const toggleWorkerAccountStatus = async (req: Request, res: Response) => {
  try {
    const workerId = parseInt(req.params.id);
    const { activo } = req.body; // Recibimos true o false desde el frontend

    // 1. Buscamos al trabajador
    const worker = await userModel.getWorkerById(workerId);
    
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Trabajador no encontrado' });
    }

    // 2. Bloquear o Desbloquear en Firebase
    // Si activo es false, 'disabled' debe ser true.
    if (worker.firebase_uid) {
      console.log(`[Admin] Cambiando estado en Firebase. UID: ${worker.firebase_uid}, disabled: ${!activo}`);
      await admin.auth().updateUser(worker.firebase_uid, {
        disabled: !activo 
      });
    }

    // 3. Actualizar en PostgreSQL
    await userModel.toggleWorkerStatus(workerId, activo);

    res.status(200).json({ 
      success: true, 
      message: activo ? 'Trabajador reactivado exitosamente' : 'Trabajador desactivado exitosamente (ya no podrá iniciar sesión)' 
    });

  } catch (error: any) {
    console.error('❌ Error en adminController (toggleWorkerAccountStatus):', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al cambiar el estado del trabajador',
      details: error.message 
    });
  }
};