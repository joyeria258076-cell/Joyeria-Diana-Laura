// Ruta: Backend/src/controllers/admin/adminController.ts
import { Request, Response } from 'express';
import admin from '../../config/firebase'; 
import * as userModel from '../../models/userModel';
import bcrypt from 'bcryptjs';
import { SessionService } from '../../services/SessionService'; // ← AÑADIDO

/**
 * Registra un nuevo trabajador tanto en Firebase Auth como en la Base de Datos local.
 */
export const createWorkerAccount = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los campos son obligatorios (nombre, email, password, rol)' 
      });
    }

    const SQL_INJECTION_PATTERN = /('(\s)*(or|and)(\s)*')|(-{2})|(\bUNION\b.*\bSELECT\b)|(\bDROP\b.*\bTABLE\b)|(\bINSERT\b.*\bINTO\b)|(\bDELETE\b.*\bFROM\b)|(;(\s)*DROP)|(xp_)/i;
    const XSS_PATTERN = /<\s*script|javascript:|on\w+\s*=|<\s*iframe|<\s*object|<\s*embed/i;
    if (SQL_INJECTION_PATTERN.test(nombre) || XSS_PATTERN.test(nombre) ||
        SQL_INJECTION_PATTERN.test(email) || XSS_PATTERN.test(email)) {
      return res.status(400).json({ success: false, message: 'Datos inválidos en la solicitud' });
    }

    const ROLES_PERMITIDOS = ['admin', 'trabajador', 'cliente'];
    if (!ROLES_PERMITIDOS.includes(rol.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Rol no válido' });
    }

    console.log(`[Admin] Iniciando proceso de alta para: ${email}`);

    const firebaseUser = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
      emailVerified: true,
    });

    console.log(`[Firebase] Usuario creado exitosamente. UID: ${firebaseUser.uid}`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const success = await userModel.createWorker({
      nombre,
      email,
      password_hash: hashedPassword,
      firebase_uid: firebaseUser.uid,
      rol: rol
    });

    if (success) {
      return res.status(201).json({ 
        success: true, 
        message: 'Trabajador registrado correctamente en Firebase y Base de Datos' 
      });
    } else {
      await admin.auth().deleteUser(firebaseUser.uid);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al sincronizar con la base de datos local' 
      });
    }

  } catch (error: any) {
    console.error('❌ Error en adminController (createWorkerAccount):', error);
    
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
    const roles = await userModel.getAvailableRoles();
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
 * Activa o Desactiva a un trabajador en BD, Firebase y sesiones activas.
 */
export const toggleWorkerAccountStatus = async (req: Request, res: Response) => {
  try {
    const workerId = Number.parseInt(req.params.id);
    const { activo } = req.body;

    // 1. Buscar al trabajador
    const worker = await userModel.getWorkerById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Trabajador no encontrado' });
    }

    // 2. Bloquear o desbloquear en Firebase
    if (worker.firebase_uid) {
      console.log(`[Admin] Cambiando estado en Firebase. UID: ${worker.firebase_uid}, disabled: ${!activo}`);
      await admin.auth().updateUser(worker.firebase_uid, { disabled: !activo });
    }

    // 3. Actualizar en PostgreSQL
    await userModel.toggleWorkerStatus(workerId, activo);

    // 4. ✅ Si se DESACTIVA — revocar todas sus sesiones activas
    //    Así el frontend detecta el 403 en el próximo ciclo de validación (≤15 seg)
    if (!activo) {
      console.log(`[Admin] Revocando sesiones activas del trabajador ID: ${workerId}`);
      const revokeResult = await SessionService.revokeAllSessions(workerId);
      console.log(`[Admin] Sesiones revocadas: ${revokeResult.revokedCount}`);
    }

    res.status(200).json({ 
      success: true, 
      message: activo 
        ? 'Trabajador reactivado exitosamente' 
        : 'Trabajador desactivado y sesiones cerradas exitosamente'
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

export const updateWorker = async (req: Request, res: Response) => {
  try {
    const workerId = Number.parseInt(req.params.id);
    const { nombre, rol, email } = req.body;

    if (!nombre || !rol || !email) {
      return res.status(400).json({ success: false, message: 'Faltan datos' });
    }

    // ✅ Validación de entrada contra inyección SQL
    const SQL_INJECTION_PATTERN = /('(\s)*(or|and)(\s)*')|(-{2})|(\bUNION\b.*\bSELECT\b)|(\bDROP\b.*\bTABLE\b)|(\bINSERT\b.*\bINTO\b)|(\bDELETE\b.*\bFROM\b)|(;(\s)*DROP)|(xp_)/i;
    if (SQL_INJECTION_PATTERN.test(nombre) || SQL_INJECTION_PATTERN.test(email)) {
      return res.status(400).json({ success: false, message: 'Datos inválidos en la solicitud' });
    }

    const ROLES_PERMITIDOS = ['admin', 'trabajador', 'cliente'];
    if (!ROLES_PERMITIDOS.includes(rol.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Rol no válido' });
    }
    
    const updatedUser = await userModel.updateWorkerInfo(workerId, nombre, rol.toLowerCase(), email);
    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
};