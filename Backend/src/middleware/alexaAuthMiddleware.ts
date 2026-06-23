// Ruta: Backend/src/middleware/alexaAuthMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

// Extiende Request para adjuntar el usuario validado
export interface AlexaAuthRequest extends Request {
    alexaUser?: {
        id: number;
        email: string;
        nombre: string;
        rol: string;
    };
}

// ─── Middleware: valida el access_token enviado por Alexa ───────────────────
// Alexa lo envía como header: Authorization: Bearer <access_token>
export const validarAlexaToken = async (
    req: AlexaAuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No se encontró sesión vinculada. Por favor vincula tu cuenta desde la app de Alexa.',
                requiresLinking: true
            });
        }

        const accessToken = authHeader.replace('Bearer ', '').trim();

        const tokenRes = await pool.query(
            `SELECT t.usuario_id, t.fecha_expira, t.revocado,
                    u.id, u.email, u.nombre, u.rol, u.activo
             FROM oauth_tokens t
             JOIN usuarios u ON u.id = t.usuario_id
             WHERE t.access_token = $1`,
            [accessToken]
        );

        if (tokenRes.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido. Por favor vincula tu cuenta de nuevo.',
                requiresLinking: true
            });
        }

        const row = tokenRes.rows[0];

        if (row.revocado) {
            return res.status(401).json({
                success: false,
                message: 'Tu sesión fue revocada. Vincula tu cuenta de nuevo.',
                requiresLinking: true
            });
        }

        if (new Date(row.fecha_expira) < new Date()) {
            return res.status(401).json({
                success: false,
                message: 'Tu sesión expiró. Alexa debería renovarla automáticamente; si el problema persiste, vincula tu cuenta de nuevo.',
                requiresLinking: true
            });
        }

        if (!row.activo) {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta está desactivada. Contacta al administrador.'
            });
        }

        if (!['trabajador', 'admin'].includes(String(row.rol))) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para esta acción.'
            });
        }

        // Adjuntar usuario validado al request
        req.alexaUser = {
            id: row.usuario_id,
            email: row.email,
            nombre: row.nombre,
            rol: row.rol
        };

        next();

    } catch (error: any) {
        console.error('❌ Error en validarAlexaToken:', error);
        res.status(500).json({ success: false, message: 'Error interno validando sesión.' });
    }
};