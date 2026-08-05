import { pool } from '../config/database';

export interface ZonaEntrega {
    id: number;
    nombre: string;
    activo: boolean;
    orden: number;
    creado_en: Date;
}

export const ZonaEntregaModel = {
    getAll: async (soloActivas: boolean): Promise<ZonaEntrega[]> => {
        const query = soloActivas
            ? 'SELECT * FROM zonas_entrega WHERE activo = true ORDER BY orden ASC, nombre ASC'
            : 'SELECT * FROM zonas_entrega ORDER BY orden ASC, nombre ASC';
        const result = await pool.query(query);
        return result.rows;
    },

    create: async (nombre: string): Promise<ZonaEntrega> => {
        const result = await pool.query(
            'INSERT INTO zonas_entrega (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        return result.rows[0];
    },

    remove: async (id: number): Promise<void> => {
        await pool.query('DELETE FROM zonas_entrega WHERE id = $1', [id]);
    }
};
