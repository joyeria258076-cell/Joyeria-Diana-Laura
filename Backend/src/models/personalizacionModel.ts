// Ruta: Backend/src/models/personalizacionModel.ts
import { pool } from '../config/database';

export const PersonalizacionModel = {
    crear: async (cliente_id: number, producto_id: number, detalle: string, imagen_referencia_url: string | null) => {
        const result = await pool.query(`
            INSERT INTO solicitudes_personalizacion (cliente_id, producto_id, detalle, imagen_referencia_url)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [cliente_id, producto_id, detalle, imagen_referencia_url]);
        return result.rows[0];
    },

    getMisSolicitudes: async (cliente_id: number) => {
        const result = await pool.query(`
            SELECT sp.*, p.nombre AS producto_nombre, p.imagen_principal AS producto_imagen,
                   p.precio_venta, p.precio_personalizacion
            FROM solicitudes_personalizacion sp
            JOIN productos p ON p.id = sp.producto_id
            WHERE sp.cliente_id = $1
            ORDER BY sp.fecha_creacion DESC
        `, [cliente_id]);
        return result.rows;
    },

    getPendientes: async (estado?: string) => {
        const result = await pool.query(`
            SELECT sp.*, p.nombre AS producto_nombre, p.imagen_principal AS producto_imagen,
                   c.nombre AS cliente_nombre, c.email AS cliente_email
            FROM solicitudes_personalizacion sp
            JOIN productos p ON p.id = sp.producto_id
            JOIN clientes c ON c.id = sp.cliente_id
            WHERE ($1::varchar IS NULL OR sp.estado = $1)
            ORDER BY sp.fecha_creacion ASC
        `, [estado || null]);
        return result.rows;
    },

    getById: async (id: number) => {
        const result = await pool.query(`
            SELECT sp.*, p.nombre AS producto_nombre, p.precio_venta, p.precio_personalizacion,
                   c.nombre AS cliente_nombre, c.email AS cliente_email
            FROM solicitudes_personalizacion sp
            JOIN productos p ON p.id = sp.producto_id
            JOIN clientes c ON c.id = sp.cliente_id
            WHERE sp.id = $1
        `, [id]);
        return result.rows[0] || null;
    },

    aprobar: async (id: number, trabajador_id: number) => {
        const result = await pool.query(`
            UPDATE solicitudes_personalizacion
            SET estado = 'aprobada', respondido_por = $2, fecha_respuesta = CURRENT_TIMESTAMP
            WHERE id = $1 AND estado = 'pendiente'
            RETURNING *
        `, [id, trabajador_id]);
        return result.rows[0] || null;
    },

    rechazar: async (id: number, trabajador_id: number, motivo: string) => {
        const result = await pool.query(`
            UPDATE solicitudes_personalizacion
            SET estado = 'rechazada', motivo_rechazo = $3, respondido_por = $2, fecha_respuesta = CURRENT_TIMESTAMP
            WHERE id = $1 AND estado = 'pendiente'
            RETURNING *
        `, [id, trabajador_id, motivo]);
        return result.rows[0] || null;
    },

    marcarUtilizada: async (id: number) => {
        await pool.query(`UPDATE solicitudes_personalizacion SET utilizada = true WHERE id = $1`, [id]);
    },
};
