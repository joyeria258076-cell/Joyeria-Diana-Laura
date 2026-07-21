// Ruta: Backend/src/models/resenaModel.ts
import { pool } from '../config/database';

export const ResenaModel = {

    puedeResenar: async (usuario_id: number, producto_id: number): Promise<boolean> => {
        const result = await pool.query(`
            SELECT 1 FROM detalle_ventas dv
            JOIN ventas v ON v.id = dv.venta_id
            WHERE dv.producto_id = $1 AND v.creado_por = $2 AND v.estado = 'entregado'
            LIMIT 1
        `, [producto_id, usuario_id]);
        return (result.rowCount ?? 0) > 0;
    },

    getMiResena: async (usuario_id: number, producto_id: number) => {
        const result = await pool.query(
            `SELECT * FROM resenas_producto WHERE producto_id = $1 AND usuario_id = $2`,
            [producto_id, usuario_id]
        );
        return result.rows[0] || null;
    },

    getByProducto: async (producto_id: number) => {
        const resenas = await pool.query(`
            SELECT id, cliente_nombre, calificacion, comentario, fecha_creacion, fecha_actualizacion
            FROM resenas_producto
            WHERE producto_id = $1
            ORDER BY fecha_creacion DESC
        `, [producto_id]);

        const stats = await pool.query(`
            SELECT
                COUNT(*)::int AS total,
                COALESCE(ROUND(AVG(calificacion)::numeric, 1), 0) AS promedio
            FROM resenas_producto
            WHERE producto_id = $1
        `, [producto_id]);

        return {
            resenas: resenas.rows,
            total: stats.rows[0].total,
            promedio: Number.parseFloat(stats.rows[0].promedio)
        };
    },

    upsert: async (usuario_id: number, producto_id: number, cliente_nombre: string, calificacion: number, comentario?: string) => {
        const result = await pool.query(`
            INSERT INTO resenas_producto (producto_id, usuario_id, cliente_nombre, calificacion, comentario)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (producto_id, usuario_id)
            DO UPDATE SET
                calificacion = EXCLUDED.calificacion,
                comentario = EXCLUDED.comentario,
                fecha_actualizacion = CURRENT_TIMESTAMP
            RETURNING *
        `, [producto_id, usuario_id, cliente_nombre, calificacion, comentario || null]);
        return result.rows[0];
    }
};
