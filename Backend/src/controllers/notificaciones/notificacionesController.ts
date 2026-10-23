// Registro de los teléfonos que reciben notificaciones push (HU-15, app móvil #54).
import { Request, Response } from 'express';
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
