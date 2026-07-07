import { Request, Response } from 'express';
import { pool } from '../../config/database';

const getUserId = (req: Request): number | null => {
    const u = (req as any).user;
    return u?.userId || u?.id || null;
};

export const getFavoritos = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });
    try {
        const result = await pool.query(`
            SELECT
                f.id, f.fecha_agregado,
                p.id AS producto_id, p.nombre, p.precio_venta, p.precio_oferta,
                p.imagen_principal, p.stock_actual, p.es_nuevo,
                cat.nombre AS categoria_nombre,
                (
                    SELECT CASE
                        WHEN pr.tipo = 'porcentaje' THEN ROUND((p.precio_venta * (1 - pr.valor_descuento / 100.0))::numeric, 2)
                        WHEN pr.tipo = 'monto_fijo' THEN GREATEST(0, ROUND((p.precio_venta - pr.valor_descuento)::numeric, 2))
                        ELSE NULL
                    END
                    FROM promociones pr
                    WHERE pr.activo = true AND pr.fecha_inicio <= NOW() AND pr.fecha_fin >= NOW()
                      AND pr.tipo IN ('porcentaje', 'monto_fijo')
                      AND (pr.aplica_productos IS NULL OR p.id = ANY(pr.aplica_productos)
                           OR (pr.aplica_categorias IS NULL OR p.categoria_id = ANY(pr.aplica_categorias)))
                    ORDER BY pr.valor_descuento DESC LIMIT 1
                ) AS precio_promocion
            FROM favoritos f
            JOIN productos p ON f.producto_id = p.id
            JOIN categorias cat ON p.categoria_id = cat.id
            WHERE f.usuario_id = $1 AND p.activo = true
            ORDER BY f.fecha_agregado DESC
        `, [userId]);
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleFavorito = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });
    const { producto_id } = req.body;
    if (!producto_id) return res.status(400).json({ success: false, message: 'producto_id requerido' });
    try {
        const existe = await pool.query(
            `SELECT id FROM favoritos WHERE usuario_id = $1 AND producto_id = $2`,
            [userId, producto_id]
        );
        if (existe.rows.length > 0) {
            await pool.query(`DELETE FROM favoritos WHERE usuario_id = $1 AND producto_id = $2`, [userId, producto_id]);
            res.json({ success: true, favorito: false, message: 'Eliminado de favoritos' });
        } else {
            await pool.query(
                `INSERT INTO favoritos (usuario_id, producto_id) VALUES ($1, $2)`,
                [userId, producto_id]
            );
            res.json({ success: true, favorito: true, message: 'Agregado a favoritos' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const checkFavorito = async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.json({ success: true, favorito: false });
    const { producto_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT id FROM favoritos WHERE usuario_id = $1 AND producto_id = $2`,
            [userId, producto_id]
        );
        res.json({ success: true, favorito: result.rows.length > 0 });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
