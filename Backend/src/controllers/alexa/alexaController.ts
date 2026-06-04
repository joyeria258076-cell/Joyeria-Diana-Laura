import { Request, Response } from 'express';
import pool from '../../config/database';

// ── GET /api/alexa/inventario ─────────────────────────────────────────────────
// Parámetros opcionales: ?categoria=aretes&material=plata
export const getInventario = async (req: Request, res: Response) => {
  try {
    const { categoria, material } = req.query;

    let query = `
      SELECT 
        p.id,
        p.nombre,
        p.codigo,
        p.categoria_nombre,
        p.material_principal,
        p.precio_oferta AS precio_venta,
        p.precio_oferta,
        p.stock_actual,
        p.stock_minimo,
        p.descripcion,
        p.es_nuevo,
        p.es_destacado
      FROM productos p
      WHERE p.activo = true
    `;
    const params: any[] = [];
    let idx = 1;

    if (categoria) {
      query += ` AND LOWER(p.categoria_nombre) ILIKE $${idx}`;
      params.push(`%${categoria}%`);
      idx++;
    }
    if (material) {
      query += ` AND LOWER(p.material_principal) ILIKE $${idx}`;
      params.push(`%${material}%`);
      idx++;
    }

    query += ` ORDER BY p.categoria_nombre, p.nombre`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Alexa getInventario error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar inventario' });
  }
};

// ── GET /api/alexa/inventario/resumen ─────────────────────────────────────────
// Resumen por categoría: stock total, stock bajo, agotados
export const getResumenInventario = async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        p.categoria_nombre AS categoria,
        COUNT(*) AS total_productos,
        SUM(p.stock_actual) AS stock_total,
        MIN(p.precio_oferta) AS precio_min,
        MIN(p.precio_oferta) AS precio_min,
        MAX(p.precio_oferta) AS precio_max,
        SUM(CASE WHEN p.stock_actual = 0 THEN 1 ELSE 0 END) AS agotados,
        SUM(CASE WHEN p.stock_actual > 0 AND p.stock_actual <= p.stock_minimo THEN 1 ELSE 0 END) AS stock_bajo
      FROM productos p
      WHERE p.activo = true
      GROUP BY p.categoria_nombre
      ORDER BY p.categoria_nombre
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Alexa getResumenInventario error:', error);
    res.status(500).json({ success: false, message: 'Error al obtener resumen' });
  }
};

// ── GET /api/alexa/productos/mas-vendido ──────────────────────────────────────
// Parámetro opcional: ?categoria=aretes
export const getMasVendido = async (req: Request, res: Response) => {
  try {
    const { categoria } = req.query;

    let query = `
      SELECT 
        dv.producto_nombre AS nombre,
        p.categoria_nombre AS categoria,
        p.material_principal AS material,
        p.precio_venta,
        p.stock_actual,
        SUM(dv.cantidad) AS total_vendido
      FROM detalle_ventas dv
      JOIN productos p ON p.id = dv.producto_id
      JOIN ventas v ON v.id = dv.venta_id
      WHERE v.estado NOT IN ('cancelado')
        AND p.activo = true
    `;
    const params: any[] = [];

    if (categoria) {
      query += ` AND LOWER(p.categoria_nombre) ILIKE $1`;
      params.push(`%${categoria}%`);
    }

    query += `
      GROUP BY dv.producto_nombre, p.categoria_nombre, p.material_principal, p.precio_venta, p.stock_actual
      ORDER BY total_vendido DESC
      LIMIT 1
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null, message: 'Sin ventas registradas' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Alexa getMasVendido error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar ventas' });
  }
};

// ── GET /api/alexa/productos/navegacion ───────────────────────────────────────
// Parámetro: ?tipo=primero|ultimo|siguiente|anterior&categoria=aretes&actual_id=5
export const getNavegacion = async (req: Request, res: Response) => {
  try {
    const { tipo, categoria, actual_id } = req.query;

    let query = '';
    const params: any[] = [];

    if (tipo === 'primero') {
      query = `
        SELECT id, nombre, categoria_nombre, material_principal, precio_venta, stock_actual, descripcion
        FROM productos WHERE activo = true
        ${categoria ? 'AND LOWER(categoria_nombre) ILIKE $1' : ''}
        ORDER BY id ASC LIMIT 1
      `;
      if (categoria) params.push(`%${categoria}%`);

    } else if (tipo === 'ultimo') {
      query = `
        SELECT id, nombre, categoria_nombre, material_principal, precio_venta, stock_actual, descripcion
        FROM productos WHERE activo = true
        ${categoria ? 'AND LOWER(categoria_nombre) ILIKE $1' : ''}
        ORDER BY id DESC LIMIT 1
      `;
      if (categoria) params.push(`%${categoria}%`);

    } else if (tipo === 'siguiente' && actual_id) {
      query = `
        SELECT id, nombre, categoria_nombre, material_principal, precio_venta, stock_actual, descripcion
        FROM productos WHERE activo = true AND id > $1
        ${categoria ? 'AND LOWER(categoria_nombre) ILIKE $2' : ''}
        ORDER BY id ASC LIMIT 1
      `;
      params.push(Number(actual_id));
      if (categoria) params.push(`%${categoria}%`);

    } else if (tipo === 'anterior' && actual_id) {
      query = `
        SELECT id, nombre, categoria_nombre, material_principal, precio_venta, stock_actual, descripcion
        FROM productos WHERE activo = true AND id < $1
        ${categoria ? 'AND LOWER(categoria_nombre) ILIKE $2' : ''}
        ORDER BY id DESC LIMIT 1
      `;
      params.push(Number(actual_id));
      if (categoria) params.push(`%${categoria}%`);

    } else {
      return res.status(400).json({ success: false, message: 'Tipo de navegación inválido' });
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No hay más productos' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Alexa getNavegacion error:', error);
    res.status(500).json({ success: false, message: 'Error en navegación' });
  }
};

// ── GET /api/alexa/apartados/:cliente ─────────────────────────────────────────
// Busca ventas con estado 'apartado' por nombre de cliente
export const getApartado = async (req: Request, res: Response) => {
  try {
    const { cliente } = req.params;

    const query = `
      SELECT 
        v.folio,
        v.cliente_nombre_completo AS cliente,
        v.total,
        v.subtotal,
        v.estado,
        v.fecha_creacion,
        v.fecha_actualizacion,
        COALESCE(
          (SELECT SUM(tp.monto) 
           FROM transacciones_pago tp 
           WHERE tp.venta_id = v.id AND tp.estado = 'aprobado'),
          0
        ) AS total_abonado,
        (v.total - COALESCE(
          (SELECT SUM(tp.monto) 
           FROM transacciones_pago tp 
           WHERE tp.venta_id = v.id AND tp.estado = 'aprobado'),
          0
        )) AS restante,
        json_agg(
          json_build_object(
            'producto', dv.producto_nombre,
            'cantidad', dv.cantidad,
            'precio', dv.precio_unitario
          )
        ) AS productos
      FROM ventas v
      JOIN detalle_ventas dv ON dv.venta_id = v.id
      WHERE v.estado = 'apartado'
        AND LOWER(v.cliente_nombre_completo) ILIKE $1
      GROUP BY v.id, v.folio, v.cliente_nombre_completo, v.total, v.subtotal, v.estado, v.fecha_creacion, v.fecha_actualizacion
      ORDER BY v.fecha_creacion DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [`%${cliente}%`]);

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No se encontró apartado activo' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Alexa getApartado error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar apartado' });
  }
};