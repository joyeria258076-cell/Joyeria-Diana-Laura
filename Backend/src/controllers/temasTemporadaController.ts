// Backend/src/controllers/temasTemporadaController.ts
// Temáticas de temporada (Halloween, San Valentín, Navidad…). El admin las da
// de alta y las activa; los usuarios ven las activas en su selector de tema y
// deciden si las usan. Una temática con fechas solo se ofrece dentro de ese rango.
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { getOrSetCache, invalidateCache } from '../utils/simpleCache';

const CACHE_ACTIVAS = 'temas-temporada:activas';
const COLORES = ['color_fondo', 'color_superficie', 'color_superficie_2', 'color_principal', 'color_principal_fuerte',
    'color_acento', 'color_texto', 'color_texto_suave'] as const;
const DECORACIONES = ['ninguna', 'calabazas', 'corazones', 'nieve', 'estrellas', 'flores'];
const HEX = /^#[0-9a-fA-F]{6}$/;

const slug = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36);

/** Valida el cuerpo de alta/edición. Devuelve el mensaje de error o null. */
const validar = (b: any): string | null => {
    if (!b.nombre || !String(b.nombre).trim()) return 'El nombre es obligatorio';
    if (String(b.nombre).trim().length > 60) return 'El nombre no puede pasar de 60 caracteres';
    if (b.modo && !['oscuro', 'claro'].includes(b.modo)) return 'El modo debe ser oscuro o claro';
    for (const c of COLORES) if (!HEX.test(b[c] || '')) return `Color inválido en ${c.replace('color_', '').replace(/_/g, ' ')}`;
    if (b.decoracion && !DECORACIONES.includes(b.decoracion)) return 'Decoración no válida';
    if (b.fecha_inicio && b.fecha_fin && b.fecha_inicio > b.fecha_fin) return 'La fecha de inicio no puede ser posterior a la de fin';
    return null;
};

const valores = (b: any) => [
    String(b.nombre).trim(), (b.descripcion || '').toString().trim().slice(0, 160) || null, b.modo || 'oscuro',
    ...COLORES.map(c => b[c]), b.decoracion || 'ninguna', !!b.activo, b.fecha_inicio || null, b.fecha_fin || null,
];

export const temasTemporadaController = {
    /** Públicas: activas y dentro de su rango de fechas (si lo tienen). */
    getActivas: async (_req: Request, res: Response): Promise<void> => {
        try {
            const data = await getOrSetCache(CACHE_ACTIVAS, 60_000, async () => {
                const r = await pool.query(`
                    SELECT * FROM temas_temporada
                    WHERE activo
                      AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)
                      AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
                    ORDER BY nombre`);
                return r.rows;
            });
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error en getActivas (temas):', error);
            res.status(500).json({ success: false, message: 'Error al obtener las temáticas' });
        }
    },

    /** Admin: todas. */
    getTodas: async (_req: Request, res: Response): Promise<void> => {
        try {
            const r = await pool.query('SELECT * FROM temas_temporada ORDER BY activo DESC, nombre');
            res.json({ success: true, data: r.rows });
        } catch (error) {
            console.error('Error en getTodas (temas):', error);
            res.status(500).json({ success: false, message: 'Error al obtener las temáticas' });
        }
    },

    crear: async (req: Request, res: Response): Promise<void> => {
        try {
            const error = validar(req.body);
            if (error) { res.status(400).json({ success: false, message: error }); return; }
            const clave = slug(req.body.clave || req.body.nombre) || `tema_${Date.now()}`;
            const r = await pool.query(`
                INSERT INTO temas_temporada (clave, nombre, descripcion, modo, ${COLORES.join(', ')}, decoracion, activo, fecha_inicio, fecha_fin)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
                [clave, ...valores(req.body)]);
            invalidateCache(CACHE_ACTIVAS);
            res.status(201).json({ success: true, data: r.rows[0] });
        } catch (error: any) {
            if (error.code === '23505') { res.status(409).json({ success: false, message: 'Ya existe una temática con ese nombre' }); return; }
            console.error('Error en crear (temas):', error);
            res.status(500).json({ success: false, message: 'Error al crear la temática' });
        }
    },

    actualizar: async (req: Request, res: Response): Promise<void> => {
        try {
            const error = validar(req.body);
            if (error) { res.status(400).json({ success: false, message: error }); return; }
            const r = await pool.query(`
                UPDATE temas_temporada SET nombre = $1, descripcion = $2, modo = $3,
                  ${COLORES.map((c, i) => `${c} = $${i + 4}`).join(', ')},
                  decoracion = $12, activo = $13, fecha_inicio = $14, fecha_fin = $15, actualizado_en = now()
                WHERE id = $16 RETURNING *`,
                [...valores(req.body), Number(req.params.id)]);
            if (!r.rows.length) { res.status(404).json({ success: false, message: 'Temática no encontrada' }); return; }
            invalidateCache(CACHE_ACTIVAS);
            res.json({ success: true, data: r.rows[0] });
        } catch (error) {
            console.error('Error en actualizar (temas):', error);
            res.status(500).json({ success: false, message: 'Error al actualizar la temática' });
        }
    },

    /** Activar / desactivar sin tocar lo demás. */
    cambiarActivo: async (req: Request, res: Response): Promise<void> => {
        try {
            const r = await pool.query(
                'UPDATE temas_temporada SET activo = $1, actualizado_en = now() WHERE id = $2 RETURNING *',
                [!!req.body.activo, Number(req.params.id)]);
            if (!r.rows.length) { res.status(404).json({ success: false, message: 'Temática no encontrada' }); return; }
            invalidateCache(CACHE_ACTIVAS);
            res.json({ success: true, data: r.rows[0] });
        } catch (error) {
            console.error('Error en cambiarActivo (temas):', error);
            res.status(500).json({ success: false, message: 'Error al cambiar la temática' });
        }
    },

    eliminar: async (req: Request, res: Response): Promise<void> => {
        try {
            const r = await pool.query('DELETE FROM temas_temporada WHERE id = $1 RETURNING id', [Number(req.params.id)]);
            if (!r.rows.length) { res.status(404).json({ success: false, message: 'Temática no encontrada' }); return; }
            invalidateCache(CACHE_ACTIVAS);
            res.json({ success: true });
        } catch (error) {
            console.error('Error en eliminar (temas):', error);
            res.status(500).json({ success: false, message: 'Error al eliminar la temática' });
        }
    },
};
