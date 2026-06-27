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
// 🔧 CAMBIO: ya NO rechaza por rol aquí — solo valida que el token sea válido,
// esté activo y no haya expirado. Cada endpoint específico decide si requiere
// 'trabajador'/'admin' (datos operativos) o acepta cualquier rol (datos propios
// del cliente, como su carrito o sus pedidos).
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
                message: 'Tu sesión expiró. Vincula tu cuenta de nuevo.',
                requiresLinking: true
            });
        }

        if (!row.activo) {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta está desactivada. Contacta al administrador.'
            });
        }

        // Adjuntar usuario validado al request — cualquier rol llega hasta aquí
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

// ─── Middleware adicional: exige rol trabajador/admin ────────────────────────
// 🆕 Úsalo DESPUÉS de validarAlexaToken en las rutas operativas (apartados,
// abonos, inventario) que nunca deben ser accesibles para un cliente.
export const exigirTrabajador = (
    req: AlexaAuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.alexaUser || !['trabajador', 'admin'].includes(req.alexaUser.rol)) {
        return res.status(403).json({
            success: false,
            message: 'Esta acción solo está disponible para personal autorizado.'
        });
    }
    next();
};