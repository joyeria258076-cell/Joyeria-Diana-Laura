import { pool } from '../config/database';

export interface ComentarioNoticia {
    id: number;
    noticia_id: number;
    usuario_id: number;
    comentario: string;
    creado_en: Date;
    usuario_nombre?: string;
}

export const ComentarioNoticiaModel = {
    getByNoticia: async (noticiaId: number): Promise<ComentarioNoticia[]> => {
        const result = await pool.query(
            `SELECT cn.*, u.nombre AS usuario_nombre
             FROM comentarios_noticias cn
             JOIN usuarios u ON u.id = cn.usuario_id
             WHERE cn.noticia_id = $1
             ORDER BY cn.creado_en DESC`,
            [noticiaId]
        );
        return result.rows;
    },

    create: async (noticiaId: number, usuarioId: number, comentario: string): Promise<ComentarioNoticia> => {
        const result = await pool.query(
            `INSERT INTO comentarios_noticias (noticia_id, usuario_id, comentario)
             VALUES ($1, $2, $3) RETURNING *`,
            [noticiaId, usuarioId, comentario]
        );
        const nuevo = result.rows[0];
        const usuario = await pool.query('SELECT nombre FROM usuarios WHERE id = $1', [usuarioId]);
        return { ...nuevo, usuario_nombre: usuario.rows[0]?.nombre };
    },

    remove: async (id: number, usuarioId: number): Promise<boolean> => {
        const result = await pool.query(
            'DELETE FROM comentarios_noticias WHERE id = $1 AND usuario_id = $2 RETURNING id',
            [id, usuarioId]
        );
        return (result.rowCount ?? 0) > 0;
    }
};
