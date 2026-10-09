// Ruta: Backend/src/controllers/admin/adminController.ts
import { Request, Response } from 'express';
import admin from '../../config/firebase'; 
import * as userModel from '../../models/userModel';
import { pool } from '../../config/database';
import bcrypt from 'bcryptjs';
import { SessionService } from '../../services/SessionService'; 
import { AuthRequest } from '../../middleware/authMiddleware';

const SUPERADMIN_EMAIL = '20221056@uthh.edu.mx';

/**
 * Registra un nuevo trabajador tanto en Firebase Auth como en la Base de Datos local.
 */
export const createWorkerAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los campos son obligatorios (nombre, email, password, rol)' 
      });
    }

    // Verificar si se intenta crear un admin y el usuario actual no es superadmin
    if (rol === 'admin') {
      const adminActualEmail = req.user?.email;
      if (adminActualEmail !== SUPERADMIN_EMAIL) {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo el administrador principal puede crear nuevas cuentas de administrador.' 
        });
      }
    }

    const SQL_INJECTION_PATTERN = /('(\s)*(or|and)(\s)*')|(-{2})|(\bUNION\b.*\bSELECT\b)|(\bDROP\b.*\bTABLE\b)|(\bINSERT\b.*\bINTO\b)|(\bDELETE\b.*\bFROM\b)|(;(\s)*DROP)|(xp_)/i;
    const XSS_PATTERN = /<\s*script|javascript:|on\w+\s*=|<\s*iframe|<\s*object|<\s*embed/i;
    if (SQL_INJECTION_PATTERN.test(nombre) || XSS_PATTERN.test(nombre) ||
        SQL_INJECTION_PATTERN.test(email) || XSS_PATTERN.test(email)) {
      return res.status(400).json({ success: false, message: 'Datos inválidos en la solicitud' });
    }

    // Desde el panel solo se dan de alta cuentas de operación (no clientes)
    const ROLES_PERMITIDOS = ['admin', 'trabajador'];
    if (!ROLES_PERMITIDOS.includes(rol.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Rol no válido' });
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) || String(nombre).trim().length < 3 || String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'Revisa el nombre, el correo y la contraseña (mínimo 8 caracteres)' });
    }
    // Correo ya registrado en la base de datos: se responde antes de tocar Firebase
    if (await userModel.getUserByEmail(email)) {
      return res.status(409).json({ success: false, message: 'Este correo electrónico ya está registrado.' });
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

    // Generar código de activación para TODA cuenta creada manualmente
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigoActivacion = '';
    for (let i = 0; i < 8; i++) codigoActivacion += chars[Math.floor(Math.random() * chars.length)];
    const codigoActivacionHash = await bcrypt.hash(codigoActivacion, 10);

    // Si falla la base de datos, se borra la cuenta de Firebase para no dejarla huérfana
    const result = await userModel.createWorker({
      nombre,
      email,
      password_hash: hashedPassword,
      firebase_uid: firebaseUser.uid,
      rol: rol,
      activado: false,
      codigo_activacion_hash: codigoActivacionHash,
    }).catch(async (e: any) => {
      await admin.auth().deleteUser(firebaseUser.uid).catch(() => {});
      throw e;
    });

    if (result) {
      console.log(`[AUDIT] Admin ${req.user?.email} (ID: ${req.user?.userId}) creó una cuenta con rol '${rol}' para ${email}`);
      return res.status(201).json({
        success: true,
        message: 'Cuenta registrada correctamente',
        data: { codigoActivacion, nombre, email },
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
    let status = 500;
    if (error.code === 'auth/email-already-exists' || error.code === '23505') {
      errorMsg = 'Este correo electrónico ya está registrado.';
      status = 409;
    } else if (error.code === 'auth/invalid-password') {
      errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
    }

    res.status(status).json({ 
      success: false, 
      message: errorMsg,
      details: error.message 
    });
  }
};

export const getRoles = async (req: AuthRequest, res: Response) => {
  try {
    const roles = await userModel.getAvailableRoles();
    
    // Filtrar el rol 'admin' si el usuario actual no es superadmin
    const currentUserEmail = req.user?.email;
    
    let allowedRoles = roles;
    if (currentUserEmail !== SUPERADMIN_EMAIL) {
      allowedRoles = roles.filter((rol: string) => rol !== 'admin');
    }
    
    res.status(200).json(allowedRoles);
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
export const toggleWorkerAccountStatus = async (req: AuthRequest, res: Response) => {
  try {
    const workerId = Number.parseInt(req.params.id);
    const { activo } = req.body;

    // 1. Buscar al trabajador
    const worker = await userModel.getWorkerById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Trabajador no encontrado' });
    }
    // Nadie puede desactivarse a sí mismo ni al administrador principal, y
    // solo el principal puede activar o desactivar a otros administradores
    if (!activo && (worker.email === SUPERADMIN_EMAIL || worker.id === req.user?.userId)) {
      return res.status(403).json({ success: false, message: 'Esta cuenta no se puede desactivar.' });
    }
    if (worker.rol === 'admin' && req.user?.email !== SUPERADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Solo el administrador principal puede activar o desactivar administradores.' });
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

export const updateWorker = async (req: AuthRequest, res: Response) => {
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

    const ROLES_PERMITIDOS = ['admin', 'trabajador'];
    if (!ROLES_PERMITIDOS.includes(rol.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Rol no válido' });
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) || String(nombre).trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Revisa el nombre y el correo' });
    }

    const actual = (await pool.query('SELECT id, email, rol, firebase_uid FROM usuarios WHERE id = $1', [workerId])).rows[0];
    if (!actual) return res.status(404).json({ success: false, message: 'Trabajador no encontrado' });

    // Igual que en el alta: solo el administrador principal puede crear,
    // modificar o quitar administradores (antes cualquiera podía promoverse)
    const esSuper = req.user?.email === SUPERADMIN_EMAIL;
    if ((rol.toLowerCase() === 'admin' || actual.rol === 'admin') && !esSuper) {
      return res.status(403).json({ success: false, message: 'Solo el administrador principal puede modificar cuentas de administrador.' });
    }

    const nuevoEmail = String(email).trim().toLowerCase();
    if (nuevoEmail !== String(actual.email).toLowerCase()) {
      const otro = await userModel.getUserByEmail(nuevoEmail);
      if (otro && otro.id !== workerId) {
        return res.status(409).json({ success: false, message: 'Ese correo ya pertenece a otra cuenta.' });
      }
    }
    // El inicio de sesión es con Firebase: si cambia el correo o el nombre
    // también se actualiza ahí; si no, la persona ya no podría entrar.
    if (actual.firebase_uid) {
      await admin.auth().updateUser(actual.firebase_uid, { email: nuevoEmail, displayName: nombre });
    }

    const updatedUser = await userModel.updateWorkerInfo(workerId, nombre.trim(), rol.toLowerCase(), nuevoEmail);
    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('❌ Error en adminController (updateWorker):', error);
    const yaExiste = (error as any)?.code === 'auth/email-already-exists' || (error as any)?.code === '23505';
    res.status(yaExiste ? 409 : 500).json({ success: false, message: yaExiste ? 'Ese correo ya pertenece a otra cuenta.' : 'Error interno' });
  }
};