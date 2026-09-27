// Backend/src/services/opcionesPersonalizacionService.ts
// Opciones de personalización que el admin da de alta (Talla, Metal, Grabado…).
// Se definen por categoría y cada producto las hereda; un grupo propio del
// producto con el mismo nombre reemplaza al de la categoría.
import { pool } from '../config/database';

export interface OpcionPers { id: number; etiqueta: string; costo_extra: number; pide_texto: boolean; texto_ayuda: string | null; }
export interface GrupoPers { id: number; nombre: string; requerido: boolean; origen: 'categoria' | 'producto'; opciones: OpcionPers[]; }

/** Elección que manda el cliente. */
export interface EleccionOpcion { grupo_id: number; opcion_id: number; texto?: string; }

/** Elección ya validada, con copia de etiquetas y costos (se guarda tal cual). */
export interface EleccionGuardada { grupo: string; opcion: string; texto: string | null; costo: number; }

const cargarGrupos = async (where: string, param: number, origen: GrupoPers['origen']): Promise<GrupoPers[]> => {
  const r = await pool.query(
    `SELECT g.id, g.nombre, g.requerido,
            COALESCE(json_agg(json_build_object(
              'id', o.id, 'etiqueta', o.etiqueta, 'costo_extra', o.costo_extra::float,
              'pide_texto', o.pide_texto, 'texto_ayuda', o.texto_ayuda) ORDER BY o.orden, o.id)
              FILTER (WHERE o.id IS NOT NULL AND o.activo), '[]') AS opciones
       FROM personalizacion_grupos g
       LEFT JOIN personalizacion_opciones o ON o.grupo_id = g.id
      WHERE g.activo AND ${where} = $1
      GROUP BY g.id ORDER BY g.orden, g.id`, [param]);
  return r.rows.map((g: any) => ({ id: g.id, nombre: g.nombre, requerido: g.requerido, origen, opciones: g.opciones }));
};

/** Grupos que aplican a un producto (categoría + propios; los propios ganan por nombre). */
export const gruposDeProducto = async (productoId: number): Promise<GrupoPers[]> => {
  const p = await pool.query('SELECT categoria_id FROM productos WHERE id = $1', [productoId]);
  if (!p.rows.length) return [];
  const propios = await cargarGrupos('g.producto_id', productoId, 'producto');
  const deCategoria = p.rows[0].categoria_id ? await cargarGrupos('g.categoria_id', p.rows[0].categoria_id, 'categoria') : [];
  const nombresPropios = new Set(propios.map(g => g.nombre.trim().toLowerCase()));
  return [...deCategoria.filter(g => !nombresPropios.has(g.nombre.trim().toLowerCase())), ...propios]
    .filter(g => g.opciones.length > 0);
};

/**
 * Valida la elección del cliente contra los grupos del producto.
 * Devuelve lo que se guarda, el costo total, un resumen legible y una clave
 * para juntar en el carrito piezas con exactamente las mismas opciones.
 */
export const validarEleccion = async (productoId: number, eleccion: EleccionOpcion[] | undefined) => {
  const grupos = await gruposDeProducto(productoId);
  if (!grupos.length) return { ok: true as const, guardado: null, costo: 0, resumen: null, clave: null };

  const porGrupo = new Map((eleccion || []).map(e => [Number(e.grupo_id), e]));
  const guardado: EleccionGuardada[] = [];
  for (const g of grupos) {
    const e = porGrupo.get(g.id);
    if (!e) {
      if (g.requerido) return { ok: false as const, mensaje: `Elige una opción de "${g.nombre}"` };
      continue;
    }
    const o = g.opciones.find(x => x.id === Number(e.opcion_id));
    if (!o) return { ok: false as const, mensaje: `La opción elegida en "${g.nombre}" ya no está disponible` };
    const texto = (e.texto || '').toString().trim().slice(0, 60);
    if (o.pide_texto && !texto) return { ok: false as const, mensaje: `Escribe ${o.texto_ayuda ? o.texto_ayuda.toLowerCase() : 'el texto'} para "${o.etiqueta}"` };
    guardado.push({ grupo: g.nombre, opcion: o.etiqueta, texto: o.pide_texto ? texto : null, costo: Number(o.costo_extra) || 0 });
  }
  if (!guardado.length) return { ok: true as const, guardado: null, costo: 0, resumen: null, clave: null };

  const costo = Number(guardado.reduce((s, x) => s + x.costo, 0).toFixed(2));
  const resumen = guardado.map(x => `${x.grupo}: ${x.opcion}${x.texto ? ` "${x.texto}"` : ''}`).join(' · ');
  const clave = guardado.map(x => `${x.grupo}=${x.opcion}=${x.texto || ''}`).join('|').toLowerCase();
  return { ok: true as const, guardado, costo, resumen, clave };
};

export const resumenDe = (opciones: EleccionGuardada[] | null | undefined) =>
  Array.isArray(opciones) && opciones.length
    ? opciones.map(x => `${x.grupo}: ${x.opcion}${x.texto ? ` "${x.texto}"` : ''}`).join(' · ')
    : null;
