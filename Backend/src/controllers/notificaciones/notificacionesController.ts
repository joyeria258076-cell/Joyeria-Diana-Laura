// Registro de los teléfonos que reciben notificaciones push (HU-15, app móvil #54).
import { Request, Response } from 'express';
import { pool } from '../../config/database';
import { PLATAFORMAS, quitarDispositivo, registrarDispositivo } from '../../services/notificacionesPushService';

const getUserId = (req: Request): number | null => {
    const u = (req as any).user;
    return u?.userId || u?.id || null;
};

// Los tokens de FCM son cadenas largas de letras, números, ':', '-' y '_'.
const tokenValido = (token: unknown): token is string =>
    typeof token === 'string' && token.length >= 20 && token.length <= 4096 && /^[A-Za-z0-9:_-]+$/.test(token);

// POST /api/notificaciones/dispositivo  { token, plataforma }
export const registrar = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { token, plataforma = 'android' } = req.body ?? {};
    if (!tokenValido(token)) return res.status(400).json({ success: false, message: 'El token del dispositivo no es válido' });
    if (!PLATAFORMAS.includes(plataforma)) return res.status(400).json({ success: false, message: 'Plataforma no válida' });

    try {
        await registrarDispositivo(Number(userId), token, plataforma);
        res.json({ success: true, message: 'Dispositivo registrado' });
    } catch (error) {
        console.error('Error registrando dispositivo push:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// DELETE /api/notificaciones/dispositivo  { token }
export const quitar = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { token } = req.body ?? {};
    if (!tokenValido(token)) return res.status(400).json({ success: false, message: 'El token del dispositivo no es válido' });

    try {
        const quitado = await quitarDispositivo(Number(userId), token);
        res.json({ success: true, quitado });
    } catch (error) {
        console.error('Error quitando dispositivo push:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// GET /api/notificaciones/preferencias  ->  { avisos_push, correos_promocion }
export const leerPreferencias = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });
    try {
        const { rows } = await pool.query('SELECT avisos_push, correos_promocion FROM usuarios WHERE id = $1', [userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'La cuenta no existe' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error leyendo preferencias de avisos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// PUT /api/notificaciones/preferencias  { avisos_push?, correos_promocion? } (solo booleanos)
export const guardarPreferencias = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { avisos_push, correos_promocion } = req.body ?? {};
    const valido = (v: unknown) => v === undefined || typeof v === 'boolean';
    if (!valido(avisos_push) || !valido(correos_promocion) || (avisos_push === undefined && correos_promocion === undefined)) {
        return res.status(400).json({ success: false, message: 'Envía avisos_push o correos_promocion como true o false' });
    }
    try {
        const { rows } = await pool.query(
            `UPDATE usuarios SET avisos_push = COALESCE($2, avisos_push), correos_promocion = COALESCE($3, correos_promocion),
               fecha_actualizacion = NOW()
             WHERE id = $1 RETURNING avisos_push, correos_promocion`,
            [userId, avisos_push ?? null, correos_promocion ?? null],
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'La cuenta no existe' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error guardando preferencias de avisos:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
