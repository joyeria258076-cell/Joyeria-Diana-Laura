// Ruta: Backend/src/controllers/alexa/alexaController.ts
import { Request, Response } from 'express';
import pool from '../../config/database';
import { AlexaAuthRequest } from '../../middleware/alexaAuthMiddleware';

// ── GET /api/alexa/inventario ─────────────────────────────────────────────────
// Parámetros opcionales: ?categoria=aretes&material=plata
// Pública — sin autenticación (catálogo es info abierta para clientes)
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
        p.precio_venta,
        p.precio_oferta,
        p.imagen_principal,
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
// Pública
export const getResumenInventario = async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        p.categoria_nombre AS categoria,
        COUNT(*) AS total_productos,
        SUM(p.stock_actual) AS stock_total,
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
// Pública
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
// Pública
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
// 🔒 PROTEGIDA — requiere token de Alexa (trabajador/admin vinculado)
// Busca ventas con estado 'apartado'/'activo' por nombre de cliente
export const getApartadoTrabajador = async (req: AlexaAuthRequest, res: Response) => {
  try {
    const { cliente } = req.params;

    const query = `
      SELECT 
        a.id,
        v.folio,
        c.nombre || ' ' || COALESCE(c.apellido, '') AS cliente,
        a.monto_total AS total,
        a.monto_pagado AS total_abonado,
        a.saldo_pendiente AS restante,
        a.estado,
        a.fecha_creacion,
        json_agg(
          json_build_object(
            'producto', dv.producto_nombre,
            'cantidad', dv.cantidad,
            'precio', dv.precio_unitario
          )
        ) AS productos
      FROM apartados a
      JOIN ventas v ON v.id = a.venta_id
      JOIN clientes c ON c.id = a.cliente_id
      JOIN detalle_ventas dv ON dv.venta_id = a.venta_id
      WHERE a.estado IN ('activo', 'pendiente_pago', 'vencido')
        AND LOWER(c.nombre || ' ' || COALESCE(c.apellido, '')) ILIKE $1
      GROUP BY a.id, v.folio, c.nombre, c.apellido, a.monto_total, a.monto_pagado, a.saldo_pendiente, a.estado, a.fecha_creacion
      ORDER BY a.fecha_creacion DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [`%${cliente}%`]);

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null, message: 'No se encontró apartado activo' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Alexa getApartadoTrabajador error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar apartado' });
  }
};

export const getTodosClientesApartados = async (req: AlexaAuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT
        c.nombre || ' ' || COALESCE(c.apellido, '') AS cliente,
        c.email,
        a.estado,
        a.folio AS folio_apartado,
        a.saldo_pendiente AS restante,
        a.monto_total AS total
      FROM apartados a
      JOIN clientes c ON c.id = a.cliente_id
      JOIN ventas v ON v.id = a.venta_id
      ORDER BY a.fecha_creacion DESC
    `);
    res.json({ success: true, data: result.rows });
} catch (error: any) {
    console.error('Alexa getTodosClientesApartados error:', error?.message || error);
    res.status(500).json({ success: false, message: error?.message || 'Error al consultar clientes' });
  }
};

// ── POST /api/alexa/apartados/:id/abono ────────────────────────────────────────
// 🔒 PROTEGIDA — requiere token de Alexa (trabajador/admin vinculado)
// Registra un abono real sobre un apartado activo
export const postRegistrarAbono = async (req: AlexaAuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.alexaUser?.id;
    const { folio } = req.params;
    const { monto, metodo_codigo } = req.body;

    if (!monto || !metodo_codigo) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Monto y método de pago son requeridos.' });
    }

    // Resolver metodo_pago_id a partir del código hablado (ej. "efectivo")
    const metodoRes = await client.query(
      `SELECT id FROM metodos_pago WHERE LOWER(codigo) = LOWER($1) AND activo = true`,
      [metodo_codigo]
    );
    if (metodoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Método de pago "${metodo_codigo}" no reconocido.` });
    }
    const metodo_pago_id = metodoRes.rows[0].id;

    // Buscar apartado por folio (de la venta asociada) — más natural para decir por voz
    const apartadoRes = await client.query(
      `SELECT a.* FROM apartados a
       JOIN ventas v ON v.id = a.venta_id
       WHERE LOWER(v.folio) = LOWER($1) AND a.estado = 'activo'`,
      [folio]
    );
    if (apartadoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Apartado no encontrado o no está activo.' });
    }

    const apartado = apartadoRes.rows[0];
    const monto_abono = parseFloat(monto);
    const monto_antes = parseFloat(apartado.saldo_pendiente);

    if (monto_abono <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'El monto debe ser mayor a $0.' });
    }

    if (monto_abono > monto_antes) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `El abono ($${monto_abono.toFixed(2)}) supera el saldo pendiente ($${monto_antes.toFixed(2)}).`
      });
    }

    const monto_despues = Math.round((monto_antes - monto_abono) * 100) / 100;
    const nuevo_monto_pagado = Math.round((parseFloat(apartado.monto_pagado) + monto_abono) * 100) / 100;
    const liquidado = monto_despues === 0;

    await client.query(
      `INSERT INTO abonos (
          apartado_id, metodo_pago_id, monto,
          monto_antes, monto_despues,
          estado, notas, registrado_por
      ) VALUES ($1,$2,$3,$4,$5,'pagado',$6,$7)`,
      [apartado.id, metodo_pago_id, monto_abono, monto_antes, monto_despues,
       'Abono registrado vía Alexa', userId]
    );

    await client.query(
      `UPDATE apartados SET
          monto_pagado = $1,
          saldo_pendiente = $2,
          estado = $3,
          trabajador_id = $4,
          actualizado_por = $4,
          fecha_actualizacion = CURRENT_TIMESTAMP
          ${liquidado ? ', fecha_liquidacion_real = CURRENT_TIMESTAMP' : ''}
       WHERE id = $5`,
      [nuevo_monto_pagado, monto_despues, liquidado ? 'liquidado' : 'activo', userId, apartado.id]
    );

    if (liquidado) {
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      await client.query(
        `UPDATE ventas SET codigo_entrega = $1, estado = 'en_preparacion', actualizado_por = $2 WHERE id = $3`,
        [codigo, userId, apartado.venta_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: liquidado
        ? 'Apartado liquidado. Se generó el código de entrega.'
        : `Abono registrado. Saldo pendiente: $${monto_despues.toFixed(2)}`,
      data: { liquidado, saldo_pendiente: monto_despues, monto_pagado: nuevo_monto_pagado }
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Alexa postRegistrarAbono error:', error);
    res.status(500).json({ success: false, message: 'Error al registrar el abono.' });
  } finally {
    client.release();
  }
};

// ── GET /api/alexa/categorias ─────────────────────────────────────────────────
// Sin ?padreId: devuelve categorías raíz (categoria_padre_id IS NULL).
// Con ?padreId=X: devuelve las subcategorías hijas de esa categoría.
// 🔧 Ahora incluye `total_subcategorias`: cuántas hijas propias tiene cada
// categoría devuelta, para poder mostrar un badge "tiene subcategorías" en
// la grilla sin necesitar una consulta extra por categoría.
export const getCategorias = async (req: Request, res: Response) => {
  try {
    const { padreId } = req.query;
 
    let query;
    let params: any[] = [];
 
    if (padreId) {
      query = `
        SELECT 
          c.id, c.nombre, c.descripcion, c.imagen_url, c.orden, c.categoria_padre_id,
          COUNT(hijas.id) AS total_subcategorias
        FROM categorias c
        LEFT JOIN categorias hijas
          ON hijas.categoria_padre_id = c.id AND hijas.activo = true
        WHERE c.categoria_padre_id = $1 AND c.activo = true
        GROUP BY c.id, c.nombre, c.descripcion, c.imagen_url, c.orden, c.categoria_padre_id
        ORDER BY c.orden ASC, c.nombre ASC
      `;
      params = [padreId];
    } else {
      query = `
        SELECT 
          c.id, c.nombre, c.descripcion, c.imagen_url, c.orden, c.categoria_padre_id,
          COUNT(hijas.id) AS total_subcategorias
        FROM categorias c
        LEFT JOIN categorias hijas
          ON hijas.categoria_padre_id = c.id AND hijas.activo = true
        WHERE c.categoria_padre_id IS NULL AND c.activo = true
        GROUP BY c.id, c.nombre, c.descripcion, c.imagen_url, c.orden, c.categoria_padre_id
        ORDER BY c.orden ASC, c.nombre ASC
      `;
    }
 
    const result = await pool.query(query, params);
 
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Alexa getCategorias error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar categorías' });
  }
};