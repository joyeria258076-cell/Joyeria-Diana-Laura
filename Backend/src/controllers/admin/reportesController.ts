// src/controllers/admin/reportesController.ts
import { Request, Response } from 'express';
import pool from '../../config/database';

const TZ = 'America/Mexico_City';

const rangoDias = (req: Request): number => {
  return Math.min(Math.max(Number.parseInt(req.query.dias as string) || 30, 1), 365);
};

// ─── 1. Ventas totales (resumen + serie por día + top clientes) ──────────────
export const getVentasTotales = async (req: Request, res: Response): Promise<void> => {
  try {
    const dias = rangoDias(req);

    const { rows: resumen } = await pool.query(`
      SELECT
        COUNT(*)                                   AS total_ventas,
        COALESCE(SUM(total), 0)                     AS ingresos_totales,
        COALESCE(SUM(total_articulos), 0)           AS articulos_vendidos,
        COALESCE(ROUND(AVG(total), 2), 0)           AS ticket_promedio
      FROM ventas
      WHERE fecha_creacion >= NOW() - ($1 || ' days')::INTERVAL
        AND estado != 'cancelado'
    `, [dias]);

    const { rows: serie } = await pool.query(`
      SELECT
        DATE_TRUNC('day', fecha_creacion AT TIME ZONE 'UTC' AT TIME ZONE $2) AS dia,
        COUNT(*)                       AS ventas,
        COALESCE(SUM(total), 0)        AS ingresos
      FROM ventas
      WHERE fecha_creacion >= NOW() - ($1 || ' days')::INTERVAL
        AND estado != 'cancelado'
      GROUP BY DATE_TRUNC('day', fecha_creacion AT TIME ZONE 'UTC' AT TIME ZONE $2)
      ORDER BY dia ASC
    `, [dias, TZ]);

    const { rows: porEstado } = await pool.query(`
      SELECT estado, COUNT(*) AS total
      FROM ventas
      WHERE fecha_creacion >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY estado
      ORDER BY total DESC
    `, [dias]);

    const { rows: topClientes } = await pool.query(`
      SELECT c.id, c.nombre, c.apellido,
        COUNT(v.id)              AS total_compras,
        COALESCE(SUM(v.total), 0) AS gasto_total
      FROM ventas v
      JOIN clientes c ON c.id = v.cliente_id
      WHERE v.fecha_creacion >= NOW() - ($1 || ' days')::INTERVAL
        AND v.estado != 'cancelado'
      GROUP BY c.id, c.nombre, c.apellido
      ORDER BY gasto_total DESC
      LIMIT 8
    `, [dias]);

    res.json({ resumen: resumen[0], serie, porEstado, topClientes, dias });
  } catch (err) {
    console.error('[reportesController] getVentasTotales:', err);
    res.status(500).json({ error: 'Error obteniendo reporte de ventas' });
  }
};

// ─── 2. Productos más vendidos ───────────────────────────────────────────────
export const getProductosMasVendidos = async (req: Request, res: Response): Promise<void> => {
  try {
    const dias = rangoDias(req);
    const limite = Math.min(Number.parseInt(req.query.limite as string) || 10, 50);

    const { rows: top } = await pool.query(`
      SELECT
        dv.producto_id,
        dv.producto_nombre,
        dv.producto_codigo,
        SUM(dv.cantidad)          AS unidades_vendidas,
        COALESCE(SUM(dv.subtotal), 0) AS ingresos_generados,
        COUNT(DISTINCT dv.venta_id)   AS num_ventas,
        p.stock_actual
      FROM detalle_ventas dv
      JOIN ventas v ON v.id = dv.venta_id
      LEFT JOIN productos p ON p.id = dv.producto_id
      WHERE v.fecha_creacion >= NOW() - ($1 || ' days')::INTERVAL
        AND v.estado != 'cancelado'
      GROUP BY dv.producto_id, dv.producto_nombre, dv.producto_codigo, p.stock_actual
      ORDER BY unidades_vendidas DESC
      LIMIT $2
    `, [dias, limite]);

    const { rows: resumen } = await pool.query(`
      SELECT
        COUNT(DISTINCT dv.producto_id)  AS productos_distintos,
        COALESCE(SUM(dv.cantidad), 0)   AS total_unidades,
        COALESCE(SUM(dv.subtotal), 0)   AS total_ingresos
      FROM detalle_ventas dv
      JOIN ventas v ON v.id = dv.venta_id
      WHERE v.fecha_creacion >= NOW() - ($1 || ' days')::INTERVAL
        AND v.estado != 'cancelado'
    `, [dias]);

    res.json({ resumen: resumen[0], top, dias });
  } catch (err) {
    console.error('[reportesController] getProductosMasVendidos:', err);
    res.status(500).json({ error: 'Error obteniendo reporte de productos' });
  }
};

// ─── 3. Inventario por categoría ─────────────────────────────────────────────
export const getInventario = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows: porCategoria } = await pool.query(`
      SELECT
        COALESCE(c.nombre, 'Sin categoría') AS categoria,
        COUNT(p.id)                          AS num_productos,
        COALESCE(SUM(p.stock_actual), 0)     AS stock_total,
        COALESCE(SUM(p.stock_actual * p.precio_venta), 0) AS valor_inventario,
        COUNT(*) FILTER (WHERE p.stock_actual <= p.stock_minimo) AS productos_stock_bajo
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = true
      GROUP BY c.nombre
      ORDER BY num_productos DESC
    `);

    const { rows: resumen } = await pool.query(`
      SELECT
        COUNT(*)                                          AS total_productos,
        COALESCE(SUM(stock_actual), 0)                     AS stock_total,
        COALESCE(SUM(stock_actual * precio_venta), 0)       AS valor_inventario,
        COUNT(*) FILTER (WHERE stock_actual <= stock_minimo) AS productos_stock_bajo,
        COUNT(*) FILTER (WHERE stock_actual = 0)            AS productos_agotados
      FROM productos
      WHERE activo = true
    `);

    const { rows: stockBajo } = await pool.query(`
      SELECT p.id, p.nombre, p.stock_actual, p.stock_minimo, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = true AND p.stock_actual <= p.stock_minimo
      ORDER BY p.stock_actual ASC
      LIMIT 10
    `);

    res.json({ resumen: resumen[0], porCategoria, stockBajo });
  } catch (err) {
    console.error('[reportesController] getInventario:', err);
    res.status(500).json({ error: 'Error obteniendo reporte de inventario' });
  }
};

// ─── 4. Performance de trabajadores ───────────────────────────────────────────
export const getPerformanceTrabajadores = async (req: Request, res: Response): Promise<void> => {
  try {
    const dias = rangoDias(req);

    const { rows } = await pool.query(`
      SELECT
        u.id, u.nombre, u.email, u.rol,
        COALESCE(v.ventas_gestionadas, 0)   AS ventas_gestionadas,
        COALESCE(a.apartados_gestionados, 0) AS apartados_gestionados,
        COALESCE(ab.abonos_registrados, 0)  AS abonos_registrados,
        COALESCE(ab.monto_cobrado, 0)       AS monto_cobrado
      FROM usuarios u
      LEFT JOIN (
        SELECT trabajador_id, COUNT(*) AS ventas_gestionadas
        FROM ventas
        WHERE fecha_creacion >= NOW() - ($1 || ' days')::INTERVAL
          AND trabajador_id IS NOT NULL
        GROUP BY trabajador_id
      ) v ON v.trabajador_id = u.id
      LEFT JOIN (
        SELECT trabajador_id, COUNT(*) AS apartados_gestionados
        FROM apartados
        WHERE fecha_creacion >= NOW() - ($1 || ' days')::INTERVAL
          AND trabajador_id IS NOT NULL
        GROUP BY trabajador_id
      ) a ON a.trabajador_id = u.id
      LEFT JOIN (
        SELECT registrado_por, COUNT(*) AS abonos_registrados, COALESCE(SUM(monto), 0) AS monto_cobrado
        FROM abonos
        WHERE fecha_creacion >= NOW() - ($1 || ' days')::INTERVAL
          AND registrado_por IS NOT NULL
        GROUP BY registrado_por
      ) ab ON ab.registrado_por = u.id
      WHERE u.rol IN ('trabajador', 'admin')
        AND (v.ventas_gestionadas > 0 OR a.apartados_gestionados > 0 OR ab.abonos_registrados > 0)
      ORDER BY (COALESCE(v.ventas_gestionadas,0) + COALESCE(a.apartados_gestionados,0) + COALESCE(ab.abonos_registrados,0)) DESC
    `, [dias]);

    res.json({ trabajadores: rows, dias });
  } catch (err) {
    console.error('[reportesController] getPerformanceTrabajadores:', err);
    res.status(500).json({ error: 'Error obteniendo reporte de trabajadores' });
  }
};
