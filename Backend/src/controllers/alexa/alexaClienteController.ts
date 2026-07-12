// Ruta: Backend/src/controllers/alexa/alexaClienteController.ts
import { Response } from 'express';
import pool from '../../config/database';
import { AlexaAuthRequest } from '../../middleware/alexaAuthMiddleware';

// ── GET /api/alexa/mi-carrito ─────────────────────────────────────────────────
// 🔒 Requiere token válido — devuelve SOLO el carrito del usuario autenticado
export const getMiCarrito = async (req: AlexaAuthRequest, res: Response) => {
  try {
    const usuarioId = req.alexaUser?.id;

    const result = await pool.query(
      `SELECT 
          c.id,
          c.cantidad,
          c.talla_medida,
          c.nota,
          p.id AS producto_id,
          p.nombre,
          p.categoria_nombre,
          p.material_principal,
          p.precio_oferta,
          p.precio_venta,
          p.imagen_principal
       FROM carrito c
       JOIN productos p ON p.id = c.producto_id
       WHERE c.usuario_id = $1 AND p.activo = true
       ORDER BY c.fecha_agregado DESC`,
      [usuarioId]
    );

    const items = result.rows.map(r => ({
      id: r.id,
      producto_id: r.producto_id,
      nombre: r.nombre,
      categoria: r.categoria_nombre,
      material: r.material_principal,
      cantidad: r.cantidad,
      precio_unitario: r.precio_oferta || r.precio_venta,
      imagen: r.imagen_principal
    }));

    const total = items.reduce((sum, i) => sum + (parseFloat(i.precio_unitario || 0) * i.cantidad), 0);

    res.json({
      success: true,
      data: { items, total: total.toFixed(2), total_articulos: items.length }
    });
  } catch (error: any) {
    console.error('Alexa getMiCarrito error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar tu carrito' });
  }
};

// ── POST /api/alexa/mi-carrito/agregar ────────────────────────────────────────
// 🔒 Body: { producto_nombre, cantidad? } — busca el producto por nombre similar
export const agregarAlCarrito = async (req: AlexaAuthRequest, res: Response) => {
  try {
    const usuarioId = req.alexaUser?.id;
    const { producto_nombre, cantidad } = req.body;

    if (!producto_nombre) {
      return res.status(400).json({ success: false, message: 'Debes indicar el nombre del producto.' });
    }

    const productoRes = await pool.query(
      `SELECT id, nombre, stock_actual FROM productos
       WHERE activo = true AND LOWER(nombre) ILIKE $1
       ORDER BY nombre LIMIT 1`,
      [`%${producto_nombre}%`]
    );

    if (productoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: `No encontré un producto llamado "${producto_nombre}".` });
    }

    const producto = productoRes.rows[0];
    const cant = parseInt(cantidad) || 1;

    if (producto.stock_actual !== null && producto.stock_actual < cant) {
      return res.status(400).json({ success: false, message: `No hay suficiente disponibilidad de ${producto.nombre} en este momento.` });
    }

    // Si ya existe en el carrito, suma la cantidad; si no, inserta nuevo
    const existente = await pool.query(
      `SELECT id, cantidad FROM carrito WHERE usuario_id = $1 AND producto_id = $2`,
      [usuarioId, producto.id]
    );

    if (existente.rows.length > 0) {
      await pool.query(
        `UPDATE carrito SET cantidad = cantidad + $1 WHERE id = $2`,
        [cant, existente.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO carrito (usuario_id, producto_id, cantidad) VALUES ($1, $2, $3)`,
        [usuarioId, producto.id, cant]
      );
    }

    res.json({ success: true, message: `${producto.nombre} se agregó a tu carrito.`, data: { nombre: producto.nombre } });
  } catch (error: any) {
    console.error('Alexa agregarAlCarrito error:', error);
    res.status(500).json({ success: false, message: 'Error al agregar al carrito' });
  }
};

// ── GET /api/alexa/mis-apartados ──────────────────────────────────────────────
// 🔒 Requiere token válido — devuelve SOLO los apartados del cliente autenticado
// (busca su registro en clientes vía usuarios.id, ya que clientes.user_id referencia usuarios.id)
export const getMisApartados = async (req: AlexaAuthRequest, res: Response) => {
  try {
    const usuarioId = req.alexaUser?.id;

    const clienteRes = await pool.query(
      `SELECT id FROM clientes WHERE user_id = $1`,
      [usuarioId]
    );

    if (clienteRes.rows.length === 0) {
      return res.json({ success: true, data: [], message: 'No tienes un perfil de cliente asociado.' });
    }

    const clienteId = clienteRes.rows[0].id;

    const result = await pool.query(
      `SELECT 
          a.id,
          a.folio AS folio_apartado,
          v.folio AS folio_venta,
          a.monto_total,
          a.monto_pagado,
          a.saldo_pendiente,
          a.estado,
          a.fecha_creacion,
          json_agg(
            json_build_object('producto', dv.producto_nombre, 'cantidad', dv.cantidad)
          ) AS productos
      FROM apartados a
      JOIN ventas v ON v.id = a.venta_id
      LEFT JOIN detalle_ventas dv ON dv.venta_id = a.venta_id
      WHERE a.cliente_id = $1
      GROUP BY a.id, v.folio, a.monto_total, a.monto_pagado, a.saldo_pendiente, a.estado, a.fecha_creacion
      ORDER BY a.fecha_creacion DESC`,
      [clienteId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Alexa getMisApartados error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar tus apartados' });
  }
};

// ── GET /api/alexa/mis-pedidos ────────────────────────────────────────────────
// 🔒 Requiere token válido — historial de pedidos (ventas) del cliente autenticado
export const getMisPedidos = async (req: AlexaAuthRequest, res: Response) => {
  try {
    const usuarioId = req.alexaUser?.id;

    const clienteRes = await pool.query(
      `SELECT id FROM clientes WHERE user_id = $1`,
      [usuarioId]
    );

    if (clienteRes.rows.length === 0) {
      return res.json({ success: true, data: [], message: 'No tienes un perfil de cliente asociado.' });
    }

    const clienteId = clienteRes.rows[0].id;

    const result = await pool.query(
      `SELECT 
          v.id,
          v.folio,
          v.estado,
          v.total,
          v.fecha_creacion,
          v.fecha_estimada_entrega,
          json_agg(
            json_build_object(
              'producto', dv.producto_nombre,
              'cantidad', dv.cantidad,
              'imagen_url', ip.url
            )
          ) AS productos
       FROM ventas v
       JOIN detalle_ventas dv ON dv.venta_id = v.id
       LEFT JOIN productos p ON p.nombre = dv.producto_nombre
       LEFT JOIN imagenes_producto ip ON ip.producto_id = p.id AND ip.es_principal = true
       WHERE v.cliente_id = $1
         AND v.estado NOT IN ('cancelado')
       GROUP BY v.id, v.folio, v.estado, v.total, v.fecha_creacion, v.fecha_estimada_entrega
       ORDER BY v.fecha_creacion DESC
       LIMIT 10`,
      [clienteId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Alexa getMisPedidos error:', error);
    res.status(500).json({ success: false, message: 'Error al consultar tus pedidos' });
  }
};

// ── POST /api/alexa/mi-carrito/quitar ─────────────────────────────────────────
// 🔒 Body: { producto_nombre }
export const quitarDelCarrito = async (req: AlexaAuthRequest, res: Response) => {
  try {
    const usuarioId = req.alexaUser?.id;
    const { producto_nombre } = req.body;

    if (!producto_nombre) {
      return res.status(400).json({ success: false, message: 'Debes indicar el nombre del producto.' });
    }

    const result = await pool.query(
      `DELETE FROM carrito c
       USING productos p
       WHERE c.producto_id = p.id
         AND c.usuario_id = $1
         AND LOWER(p.nombre) ILIKE $2
       RETURNING p.nombre`,
      [usuarioId, `%${producto_nombre}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `No encontré "${producto_nombre}" en tu carrito.` });
    }

    res.json({ success: true, message: `${result.rows[0].nombre} se quitó de tu carrito.` });
  } catch (error: any) {
    console.error('Alexa quitarDelCarrito error:', error);
    res.status(500).json({ success: false, message: 'Error al quitar del carrito' });
  }
};