// Backend/src/controllers/opcionesPersonalizacionController.ts
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { gruposDeProducto } from '../services/opcionesPersonalizacionService';

interface OpcionEntrada { etiqueta: string; costo_extra?: number; pide_texto?: boolean; texto_ayuda?: string | null; activo?: boolean; }

const validarGrupo = (b: any): string | null => {
  if (!b.nombre || !String(b.nombre).trim()) return 'Escribe el nombre del grupo (por ejemplo, Talla)';
  if (String(b.nombre).trim().length > 60) return 'El nombre no puede pasar de 60 caracteres';
  if (!b.categoria_id === !b.producto_id) return 'El grupo debe ser de una categoría o de un producto';
  const ops: OpcionEntrada[] = Array.isArray(b.opciones) ? b.opciones : [];
  if (!ops.filter(o => o.etiqueta && String(o.etiqueta).trim()).length) return 'Agrega al menos una opción';
  for (const o of ops) {
    if (o.etiqueta && String(o.etiqueta).trim().length > 60) return 'Cada opción puede tener hasta 60 caracteres';
    if (o.costo_extra != null && (Number.isNaN(Number(o.costo_extra)) || Number(o.costo_extra) < 0)) return 'El costo extra no puede ser negativo';
  }
  return null;
};

const guardarOpciones = async (client: any, grupoId: number, opciones: OpcionEntrada[]) => {
  await client.query('DELETE FROM personalizacion_opciones WHERE grupo_id = $1', [grupoId]);
  let orden = 0;
  for (const o of opciones) {
    const etiqueta = String(o.etiqueta || '').trim();
    if (!etiqueta) continue;
    await client.query(
      `INSERT INTO personalizacion_opciones (grupo_id, etiqueta, costo_extra, pide_texto, texto_ayuda, orden, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [grupoId, etiqueta, Number(o.costo_extra) || 0, !!o.pide_texto,
       o.pide_texto ? (String(o.texto_ayuda || '').trim().slice(0, 80) || null) : null, orden++, o.activo !== false]);
  }
};

const LISTA_SQL = `
  SELECT g.*, c.nombre AS categoria_nombre, p.nombre AS producto_nombre,
         COALESCE(json_agg(json_build_object('id', o.id, 'etiqueta', o.etiqueta, 'costo_extra', o.costo_extra::float,
           'pide_texto', o.pide_texto, 'texto_ayuda', o.texto_ayuda, 'activo', o.activo) ORDER BY o.orden, o.id)
           FILTER (WHERE o.id IS NOT NULL), '[]') AS opciones
    FROM personalizacion_grupos g
    LEFT JOIN categorias c ON c.id = g.categoria_id
    LEFT JOIN productos p ON p.id = g.producto_id
    LEFT JOIN personalizacion_opciones o ON o.grupo_id = g.id`;

export const opcionesPersonalizacionController = {
  /** Público: opciones que aplican a un producto. */
  deProducto: async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({ success: true, data: await gruposDeProducto(Number(req.params.id)) });
    } catch (error) {
      console.error('Error en opciones de producto:', error);
      res.status(500).json({ success: false, message: 'Error al obtener las opciones' });
    }
  },

  /** Admin: todos los grupos. */
  listar: async (_req: Request, res: Response): Promise<void> => {
    try {
      const r = await pool.query(`${LISTA_SQL} GROUP BY g.id, c.nombre, p.nombre ORDER BY c.nombre NULLS LAST, p.nombre, g.orden, g.id`);
      res.json({ success: true, data: r.rows });
    } catch (error) {
      console.error('Error listando opciones:', error);
      res.status(500).json({ success: false, message: 'Error al obtener las opciones' });
    }
  },

  crear: async (req: Request, res: Response): Promise<void> => {
    const error = validarGrupo(req.body);
    if (error) { res.status(400).json({ success: false, message: error }); return; }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const b = req.body;
      const r = await client.query(
        `INSERT INTO personalizacion_grupos (categoria_id, producto_id, nombre, requerido, orden, activo)
         VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, true)) RETURNING id`,
        [b.categoria_id || null, b.producto_id || null, String(b.nombre).trim(), !!b.requerido, b.orden ?? null, b.activo ?? null]);
      await guardarOpciones(client, r.rows[0].id, b.opciones);
      await client.query('COMMIT');
      res.status(201).json({ success: true, data: { id: r.rows[0].id } });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creando grupo de opciones:', err);
      res.status(500).json({ success: false, message: 'Error al guardar las opciones' });
    } finally { client.release(); }
  },

  actualizar: async (req: Request, res: Response): Promise<void> => {
    const error = validarGrupo(req.body);
    if (error) { res.status(400).json({ success: false, message: error }); return; }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const b = req.body;
      const r = await client.query(
        `UPDATE personalizacion_grupos SET categoria_id = $1, producto_id = $2, nombre = $3, requerido = $4,
                orden = COALESCE($5, orden), activo = COALESCE($6, activo)
          WHERE id = $7 RETURNING id`,
        [b.categoria_id || null, b.producto_id || null, String(b.nombre).trim(), !!b.requerido, b.orden ?? null, b.activo ?? null, Number(req.params.id)]);
      if (!r.rows.length) { await client.query('ROLLBACK'); res.status(404).json({ success: false, message: 'Grupo no encontrado' }); return; }
      await guardarOpciones(client, r.rows[0].id, b.opciones);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error actualizando grupo de opciones:', err);
      res.status(500).json({ success: false, message: 'Error al guardar las opciones' });
    } finally { client.release(); }
  },

  eliminar: async (req: Request, res: Response): Promise<void> => {
    try {
      const r = await pool.query('DELETE FROM personalizacion_grupos WHERE id = $1 RETURNING id', [Number(req.params.id)]);
      if (!r.rows.length) { res.status(404).json({ success: false, message: 'Grupo no encontrado' }); return; }
      res.json({ success: true });
    } catch (error) {
      console.error('Error eliminando grupo de opciones:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
  },
};
