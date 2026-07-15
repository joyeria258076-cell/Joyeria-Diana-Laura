import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/database';
import { JWTConfig } from '../../config/jwtConfig';
import { SessionService } from '../../services/SessionService';
import { JWTService } from '../../services/JWTService';
import { CookieConfig } from '../../config/cookieConfig';

const getClientIp = (req: Request): string => {
  const h = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
  if (h) return Array.isArray(h) ? h[0].split(',')[0].trim() : h.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
};

const generarCodigo = (longitud: number): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < longitud; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
};

// Token temporal (5 min) que solo sirve para el flujo de activación / código
const emitirPreAuthToken = (userId: number, etapa: 'activacion' | 'codigo'): string => {
  return jwt.sign(
    { userId, etapa, tipo: 'pre_auth' },
    JWTConfig.getSecret(),
    { expiresIn: '5m', issuer: 'joyeria-diana-laura-backend', audience: 'joyeria-diana-laura-frontend' }
  );
};

const verificarPreAuthToken = (token: string): { userId: number; etapa: string } => {
  const payload = jwt.verify(token, JWTConfig.getSecret(), {
    issuer: 'joyeria-diana-laura-backend',
    audience: 'joyeria-diana-laura-frontend',
  }) as any;
  if (payload.tipo !== 'pre_auth') throw new Error('Token inválido');
  return { userId: payload.userId, etapa: payload.etapa };
};

// ──────────────────────────────────────────────────────────────
// POST /auth/worker/pre-login
// Verifica si el email pertenece a un trabajador y valida contraseña
// Retorna preAuthToken si es válido — NO emite sesión completa
// ──────────────────────────────────────────────────────────────
export const workerPreLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ success: false, message: 'Credenciales requeridas' }); return; }

    const user = await pool.query(
      `SELECT id, nombre, email, rol, password_hash, activado, codigo_trabajador, codigo_activacion_hash
       FROM usuarios WHERE email = $1 AND activo = true`,
      [email.toLowerCase().trim()]
    );

    // No revelar si el usuario existe
    if (user.rows.length === 0) {
      res.json({ success: false, isWorker: false }); return;
    }

    const u = user.rows[0];

    // Solo aplica a cuentas con flujo de verificación:
    // - No activadas todavía (tienen codigo_activacion_hash), o
    // - Activadas y con codigo_trabajador asignado
    const tieneVerificacion = !u.activado || u.codigo_trabajador;
    if (!tieneVerificacion) {
      res.json({ success: false, isWorker: false }); return;
    }

    const valida = await bcrypt.compare(password, u.password_hash);
    if (!valida) {
      res.status(401).json({ success: false, isWorker: true, message: 'Credenciales inválidas' }); return;
    }

    const preAuthToken = emitirPreAuthToken(u.id, u.activado ? 'codigo' : 'activacion');
    res.json({
      success: true,
      requiresWorkerVerification: true,
      etapa: u.activado ? 'codigo' : 'activacion',
      preAuthToken,
    });
  } catch (error) {
    console.error('Error en workerPreLogin:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /auth/worker/activar
// El trabajador ingresa el código de activación de primera vez
// ──────────────────────────────────────────────────────────────
export const activarCuenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { preAuthToken, codigo } = req.body;
    if (!preAuthToken || !codigo?.trim()) {
      res.status(400).json({ success: false, message: 'Token y código son obligatorios' }); return;
    }

    let payload: { userId: number; etapa: string };
    try { payload = verificarPreAuthToken(preAuthToken); }
    catch { res.status(401).json({ success: false, message: 'El código de sesión expiró. Inicia sesión de nuevo.' }); return; }

    if (payload.etapa !== 'activacion') {
      res.status(400).json({ success: false, message: 'Etapa incorrecta' }); return;
    }

    const { userId } = payload;
    const user = await pool.query(
      'SELECT id, nombre, email, firebase_uid, rol, codigo_activacion_hash, activado FROM usuarios WHERE id = $1',
      [userId]
    );
    if (user.rows.length === 0) { res.status(404).json({ success: false, message: 'Usuario no encontrado' }); return; }

    const u = user.rows[0];
    if (u.activado) { res.status(409).json({ success: false, message: 'La cuenta ya fue activada' }); return; }
    if (!u.codigo_activacion_hash) { res.status(400).json({ success: false, message: 'No hay código de activación pendiente' }); return; }

    const valido = await bcrypt.compare(codigo.trim().toUpperCase(), u.codigo_activacion_hash);
    if (!valido) { res.status(400).json({ success: false, message: 'Código de activación incorrecto' }); return; }

    // Generar código de trabajador permanente (6 chars)
    const codigoTrabajador = generarCodigo(6);

    // Marcar cuenta como activada, limpiar código de activación, guardar código de trabajador
    await pool.query(
      `UPDATE usuarios SET activado = TRUE, codigo_activacion_hash = NULL, codigo_trabajador = $1 WHERE id = $2`,
      [codigoTrabajador, userId]
    );

    // Emitir sesión completa
    const userAgent = req.get('User-Agent') || 'unknown';
    const clientIp = getClientIp(req);
    const deviceInfo = SessionService.parseUserAgent(userAgent);
    const sessionResult = await SessionService.createSession(u.id, u.firebase_uid, deviceInfo, clientIp, userAgent, u.rol);

    if (!sessionResult.success || !sessionResult.sessionToken) {
      res.status(500).json({ success: false, message: 'Error al crear sesión' }); return;
    }

    const token = JWTService.generateToken({
      userId: u.id, firebaseUid: u.firebase_uid, email: u.email,
      nombre: u.nombre, sessionId: sessionResult.sessionToken
    });

    res.cookie('auth_token', token, CookieConfig.getConfig());

    res.json({
      success: true,
      message: 'Cuenta activada correctamente',
      data: {
        codigoTrabajador, // mostrar al usuario SOLO esta vez
        user: { id: u.firebase_uid, email: u.email, nombre: u.nombre, dbId: u.id, rol: u.rol },
        token,
        sessionToken: sessionResult.sessionToken,
      }
    });
  } catch (error) {
    console.error('Error en activarCuenta:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /auth/worker/verificar-codigo
// El trabajador ingresa su código de trabajador en cada login
// ──────────────────────────────────────────────────────────────
export const verificarCodigoTrabajador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { preAuthToken, codigo } = req.body;
    if (!preAuthToken || !codigo?.trim()) {
      res.status(400).json({ success: false, message: 'Token y código son obligatorios' }); return;
    }

    let payload: { userId: number; etapa: string };
    try { payload = verificarPreAuthToken(preAuthToken); }
    catch { res.status(401).json({ success: false, message: 'El código de sesión expiró. Inicia sesión de nuevo.' }); return; }

    if (payload.etapa !== 'codigo') {
      res.status(400).json({ success: false, message: 'Etapa incorrecta' }); return;
    }

    const { userId } = payload;
    const user = await pool.query(
      'SELECT id, nombre, email, firebase_uid, rol, codigo_trabajador FROM usuarios WHERE id = $1',
      [userId]
    );
    if (user.rows.length === 0) { res.status(404).json({ success: false, message: 'Usuario no encontrado' }); return; }

    const u = user.rows[0];
    if (!u.codigo_trabajador) { res.status(400).json({ success: false, message: 'No tienes código de trabajador asignado. Contacta al administrador.' }); return; }

    if (codigo.trim().toUpperCase() !== u.codigo_trabajador) {
      res.status(400).json({ success: false, message: 'Código de trabajador incorrecto' }); return;
    }

    const userAgent = req.get('User-Agent') || 'unknown';
    const clientIp = getClientIp(req);
    const deviceInfo = SessionService.parseUserAgent(userAgent);
    const sessionResult = await SessionService.createSession(u.id, u.firebase_uid, deviceInfo, clientIp, userAgent, u.rol);

    if (!sessionResult.success || !sessionResult.sessionToken) {
      res.status(500).json({ success: false, message: 'Error al crear sesión' }); return;
    }

    const token = JWTService.generateToken({
      userId: u.id, firebaseUid: u.firebase_uid, email: u.email,
      nombre: u.nombre, sessionId: sessionResult.sessionToken
    });

    res.cookie('auth_token', token, CookieConfig.getConfig());

    res.json({
      success: true,
      message: 'Acceso concedido',
      data: {
        user: { id: u.firebase_uid, email: u.email, nombre: u.nombre, dbId: u.id, rol: u.rol },
        token,
        sessionToken: sessionResult.sessionToken,
      }
    });
  } catch (error) {
    console.error('Error en verificarCodigoTrabajador:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ──────────────────────────────────────────────────────────────
// POST /auth/worker/regenerar-codigo/:userId  (solo admin)
// ──────────────────────────────────────────────────────────────
export const regenerarCodigoTrabajador = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await pool.query('SELECT id, nombre, rol FROM usuarios WHERE id = $1', [id]);
    if (user.rows.length === 0) { res.status(404).json({ success: false, message: 'Usuario no encontrado' }); return; }
    const nuevoCodigo = generarCodigo(6);
    await pool.query('UPDATE usuarios SET codigo_trabajador = $1 WHERE id = $2', [nuevoCodigo, id]);

    res.json({ success: true, message: 'Código regenerado correctamente', data: { codigoTrabajador: nuevoCodigo } });
  } catch (error) {
    console.error('Error en regenerarCodigoTrabajador:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
