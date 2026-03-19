// Ruta: Backend/src/controllers/carrito/carritoController.ts
import { Request, Response } from 'express';
import { CarritoModel, VentaModel } from '../../models/carritoModel';
import { pool } from '../../config/database';

const getUsuario = (req: Request) => {
    const user = (req as any).user;
    const id = user?.userId || user?.dbId || user?.id || null;
    return {
        id,
        email:  user?.email || '',
        nombre: user?.nombre || '',
        rol:    user?.rol?.toLowerCase() || 'cliente'
    };
};

const getRolFromDB = async (usuario_id: number): Promise<string> => {
    try {
        const result = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [usuario_id]);
        return result.rows[0]?.rol?.toLowerCase() || 'cliente';
    } catch { return 'cliente'; }
};

// ── Descontar stock al confirmar pedido ───────────────────────
const descontarStock = async (venta_id: number): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Obtener items del pedido
        const items = await client.query(`
            SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1
        `, [venta_id]);

        for (const item of items.rows) {
            // Verificar stock disponible
            const prod = await client.query(
                `SELECT stock_actual FROM productos WHERE id = $1 FOR UPDATE`, [item.producto_id]
            );
            if (!prod.rows.length) continue;

            const stockActual = prod.rows[0].stock_actual;
            const nuevoStock  = Math.max(0, stockActual - item.cantidad);

            await client.query(`
                UPDATE productos 
                SET stock_actual = $1, fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [nuevoStock, item.producto_id]);

            console.log(`📦 Stock actualizado: producto ${item.producto_id} | ${stockActual} → ${nuevoStock}`);
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// ── Restaurar stock al cancelar ───────────────────────────────
const restaurarStock = async (venta_id: number): Promise<void> => {
    const items = await pool.query(`
        SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1
    `, [venta_id]);

    for (const item of items.rows) {
        await pool.query(`
            UPDATE productos
            SET stock_actual = stock_actual + $1, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [item.cantidad, item.producto_id]);
        console.log(`♻️ Stock restaurado: producto ${item.producto_id} +${item.cantidad}`);
    }
};

// ── CARRITO ───────────────────────────────────────────────────

export const getCarrito = async (req: Request, res: Response) => {
    try {
        const { id } = getUsuario(req);
        if (!id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const items = await CarritoModel.getByUsuario(id);
        const total = items.reduce((sum, item) => {
            const precio = parseFloat(item.precio_oferta || item.precio_venta);
            return sum + (precio * item.cantidad);
        }, 0);

        res.json({ success: true, data: { items, total, count: items.length } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const agregarAlCarrito = async (req: Request, res: Response) => {
    try {
        const { id } = getUsuario(req);
        if (!id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const { producto_id, cantidad = 1, talla_medida, nota } = req.body;
        if (!producto_id) return res.status(400).json({ success: false, message: 'producto_id requerido' });

        const prod = await pool.query(
            `SELECT stock_actual, activo FROM productos WHERE id = $1`, [producto_id]
        );
        if (!prod.rows.length || !prod.rows[0].activo)
            return res.status(404).json({ success: false, message: 'Producto no disponible' });
        if (prod.rows[0].stock_actual < cantidad)
            return res.status(400).json({ success: false, message: 'Stock insuficiente' });

        const item = await CarritoModel.upsert(id, producto_id, cantidad, talla_medida, nota);
        res.json({ success: true, message: 'Agregado al carrito', data: item });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const actualizarCantidad = async (req: Request, res: Response) => {
    try {
        const { id: usuario_id } = getUsuario(req);
        if (!usuario_id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const { id } = req.params;
        const { cantidad } = req.body;
        if (!cantidad || cantidad < 1)
            return res.status(400).json({ success: false, message: 'Cantidad inválida' });

        const item = await CarritoModel.updateCantidad(parseInt(id), usuario_id, cantidad);
        if (!item) return res.status(404).json({ success: false, message: 'Item no encontrado' });

        res.json({ success: true, data: item });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const eliminarDelCarrito = async (req: Request, res: Response) => {
    try {
        const { id: usuario_id } = getUsuario(req);
        if (!usuario_id) return res.status(401).json({ success: false, message: 'No autenticado' });

        await CarritoModel.deleteItem(parseInt(req.params.id), usuario_id);
        res.json({ success: true, message: 'Item eliminado' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const vaciarCarrito = async (req: Request, res: Response) => {
    try {
        const { id } = getUsuario(req);
        if (!id) return res.status(401).json({ success: false, message: 'No autenticado' });

        await CarritoModel.clearByUsuario(id);
        res.json({ success: true, message: 'Carrito vaciado' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const contarCarrito = async (req: Request, res: Response) => {
    try {
        const { id } = getUsuario(req);
        if (!id) return res.status(200).json({ success: true, data: { count: 0 } });

        const count = await CarritoModel.countByUsuario(id);
        res.json({ success: true, data: { count } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PEDIDOS ───────────────────────────────────────────────────

export const crearPedido = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        if (!usuario.id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const { direccion_envio, notas_cliente } = req.body;
        if (!direccion_envio)
            return res.status(400).json({ success: false, message: 'Dirección de envío requerida' });

        const items = await CarritoModel.getByUsuario(usuario.id);
        if (!items.length)
            return res.status(400).json({ success: false, message: 'El carrito está vacío' });

        const cliente_id = await VentaModel.getOrCreateCliente(usuario.id, usuario.email, usuario.nombre);
        const metodo_pago_id = await VentaModel.getMetodoPagoId();
        if (!metodo_pago_id)
            return res.status(503).json({ success: false, message: 'Método de pago no configurado' });

        const productIds = items.map(i => i.producto_id);
        const prodsResult = await pool.query(
            `SELECT id, codigo, nombre, imagen_principal FROM productos WHERE id = ANY($1)`,
            [productIds]
        );
        const prodsMap = new Map(prodsResult.rows.map(p => [p.id, p]));

        const itemsPedido = items.map(item => ({
            producto_id:     item.producto_id,
            producto_codigo: prodsMap.get(item.producto_id)?.codigo || 'SIN-CODIGO',
            producto_nombre: item.producto_nombre,
            producto_imagen: item.producto_imagen,
            cantidad:        item.cantidad,
            precio_unitario: parseFloat(item.precio_oferta || item.precio_venta)
        }));

        const venta = await VentaModel.create({
            cliente_id,
            usuario_id:     usuario.id,
            cliente_nombre: usuario.nombre,
            cliente_email:  usuario.email,
            metodo_pago_id,
            direccion_envio,
            notas_cliente,
            items: itemsPedido
        });

        res.status(201).json({
            success: true,
            message: '¡Pedido solicitado! Un trabajador lo revisará pronto.',
            data: venta
        });
    } catch (error: any) {
        console.error('Error creando pedido:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMisPedidos = async (req: Request, res: Response) => {
    try {
        const { id } = getUsuario(req);
        if (!id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const ventas = await VentaModel.getByUsuario(id);
        res.json({ success: true, data: ventas });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPedidoById = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        const venta = await VentaModel.getById(parseInt(req.params.id));

        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        const esOwner = venta.creado_por === usuario.id;
        const esStaff = ['admin','trabajador'].includes(usuario.rol);
        if (!esOwner && !esStaff) {
            const rolReal = await getRolFromDB(usuario.id);
            if (!['admin','trabajador'].includes(rolReal))
                return res.status(403).json({ success: false, message: 'Acceso denegado' });
        }

        res.json({ success: true, data: venta });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllPedidos = async (req: Request, res: Response) => {
    try {
        const { estado } = req.query;
        const ventas = await VentaModel.getAll({ estado: estado as string });
        res.json({ success: true, data: ventas });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const actualizarEstadoPedido = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        const { id } = req.params;
        const { estado, notas_internas } = req.body;

        const estadosValidos = ['pendiente','confirmado','en_proceso','listo','enviado','entregado','cancelado'];
        if (!estadosValidos.includes(estado))
            return res.status(400).json({ success: false, message: 'Estado inválido' });

        // Obtener estado actual antes de actualizar
        const ventaActual = await VentaModel.getById(parseInt(id));
        if (!ventaActual) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        const estadoAnterior = ventaActual.estado;

        // Actualizar estado
        const venta = await VentaModel.updateEstado(parseInt(id), estado, usuario.id!, notas_internas);

        // ── Lógica de stock ──────────────────────────────────
        // Al confirmar: descontar stock (solo si viene de pendiente)
        if (estado === 'confirmado' && estadoAnterior === 'pendiente') {
            try {
                await descontarStock(parseInt(id));
                console.log(`✅ Stock descontado para venta ${id}`);
            } catch (stockErr) {
                console.error('⚠️ Error descontando stock:', stockErr);
                // No falla el endpoint — solo loguea el error
            }
        }

        // Al cancelar: restaurar stock (solo si ya estaba confirmado o más avanzado)
        if (estado === 'cancelado' && !['pendiente', 'cancelado'].includes(estadoAnterior)) {
            try {
                await restaurarStock(parseInt(id));
                console.log(`✅ Stock restaurado para venta ${id}`);
            } catch (stockErr) {
                console.error('⚠️ Error restaurando stock:', stockErr);
            }
        }

        res.json({ success: true, message: `Pedido actualizado a: ${estado}`, data: venta });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── MERCADOPAGO ───────────────────────────────────────────────

export const crearPreferenciaMercadoPago = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        if (!usuario.id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const { venta_id } = req.body;
        if (!venta_id) return res.status(400).json({ success: false, message: 'venta_id requerido' });

        const venta = await VentaModel.getById(venta_id);
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        if (venta.creado_por !== usuario.id)
            return res.status(403).json({ success: false, message: 'Acceso denegado' });

        // Solo pedidos confirmados pueden pagarse
        if (!['confirmado','en_proceso','listo'].includes(venta.estado))
            return res.status(400).json({ success: false, message: 'El pedido aún no está confirmado por el trabajador' });

        const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!mpToken) return res.status(503).json({ success: false, message: 'MercadoPago no configurado' });

        const items = (venta.items || []).map((item: any) => ({
            id:          String(item.producto_id),
            title:       item.producto_nombre,
            quantity:    item.cantidad,
            unit_price:  parseFloat(item.precio_unitario),
            currency_id: 'MXN',
            picture_url: item.producto_imagen || undefined
        }));

        const backUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        const body = {
            items,
            payer:              { email: usuario.email },
            external_reference: String(venta.id),
            back_urls: {
                success: `${backUrl}/pedidos?pago=exitoso&pedido=${venta.id}`,
                failure: `${backUrl}/pedidos?pago=fallido&pedido=${venta.id}`,
                pending: `${backUrl}/pedidos?pago=pendiente&pedido=${venta.id}`
            },
            auto_return:          'approved',
            notification_url:     `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/carrito/webhook/mercadopago`,
            statement_descriptor: 'Joyeria Diana Laura'
        };

        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mpToken}` },
            body: JSON.stringify(body)
        });

        if (!mpRes.ok) {
            const err = await mpRes.json();
            console.error('Error MercadoPago:', err);
            return res.status(502).json({ success: false, message: 'Error al crear preferencia de pago' });
        }

        const mpData = await mpRes.json();

        const metodo_pago_id = await VentaModel.getMetodoPagoId();
        if (metodo_pago_id) {
            await VentaModel.crearTransaccion(venta.id, metodo_pago_id, parseFloat(venta.total), mpData.id);
        }

        res.json({
            success: true,
            data: {
                preference_id:      mpData.id,
                init_point:         mpData.init_point,
                sandbox_init_point: mpData.sandbox_init_point
            }
        });
    } catch (error: any) {
        console.error('Error MP:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── PAYPAL ────────────────────────────────────────────────────

export const crearOrdenPayPal = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        if (!usuario.id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const { venta_id } = req.body;
        if (!venta_id) return res.status(400).json({ success: false, message: 'venta_id requerido' });

        const venta = await VentaModel.getById(venta_id);
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        if (venta.creado_por !== usuario.id)
            return res.status(403).json({ success: false, message: 'Acceso denegado' });

        if (!['confirmado','en_proceso','listo'].includes(venta.estado))
            return res.status(400).json({ success: false, message: 'El pedido aún no está confirmado' });

        const ppClientId = process.env.PAYPAL_CLIENT_ID;
        const ppSecret   = process.env.PAYPAL_CLIENT_SECRET;

        if (!ppClientId || !ppSecret)
            return res.status(503).json({ success: false, message: 'PayPal no configurado' });

        // Obtener token de acceso PayPal
        const ppBase = process.env.PAYPAL_MODE === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        const tokenRes = await fetch(`${ppBase}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${ppClientId}:${ppSecret}`).toString('base64')}`
            },
            body: 'grant_type=client_credentials'
        });
        const tokenData = await tokenRes.json();
        const ppToken = tokenData.access_token;

        const backUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Crear orden PayPal
        const orderRes = await fetch(`${ppBase}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ppToken}`
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    reference_id: String(venta.id),
                    amount: {
                        currency_code: 'MXN',
                        value: parseFloat(String(venta.total)).toFixed(2)
                    },
                    description: `Pedido ${venta.folio} - Joyería Diana Laura`
                }],
                application_context: {
                    return_url: `${backUrl}/pedidos?pago=exitoso&pedido=${venta.id}&metodo=paypal`,
                    cancel_url: `${backUrl}/pedidos?pago=fallido&pedido=${venta.id}&metodo=paypal`,
                    brand_name: 'Joyería Diana Laura',
                    locale: 'es-MX',
                    landing_page: 'BILLING',
                    user_action: 'PAY_NOW'
                }
            })
        });

        const orderData = await orderRes.json();

        if (!orderRes.ok) {
            console.error('Error PayPal:', orderData);
            return res.status(502).json({ success: false, message: 'Error al crear orden PayPal' });
        }

        const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;

        res.json({
            success: true,
            data: {
                order_id:    orderData.id,
                approve_url: approveLink
            }
        });
    } catch (error: any) {
        console.error('Error PayPal:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const capturarPagoPayPal = async (req: Request, res: Response) => {
    try {
        const { order_id, venta_id } = req.body;

        const ppClientId = process.env.PAYPAL_CLIENT_ID;
        const ppSecret   = process.env.PAYPAL_CLIENT_SECRET;
        const ppBase     = process.env.PAYPAL_MODE === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        const tokenRes = await fetch(`${ppBase}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${ppClientId}:${ppSecret}`).toString('base64')}`
            },
            body: 'grant_type=client_credentials'
        });
        const { access_token } = await tokenRes.json();

        const captureRes = await fetch(`${ppBase}/v2/checkout/orders/${order_id}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            }
        });
        const captureData = await captureRes.json();

        if (captureData.status === 'COMPLETED') {
            await VentaModel.confirmarPago(order_id, order_id);
            console.log(`✅ Pago PayPal capturado: orden ${order_id}`);
            res.json({ success: true, message: 'Pago capturado correctamente' });
        } else {
            res.status(400).json({ success: false, message: 'El pago no fue completado' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};



// ── EDITAR DETALLES DE VENTA ──────────────────────────────────

export const editarDetallesVenta = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        const { id } = req.params;
        const { direccion_envio, notas_internas, fecha_estimada_entrega, numero_guia, paqueteria } = req.body;

        const venta = await VentaModel.getById(parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        // Solo trabajador asignado o admin
        if (venta.trabajador_id !== usuario.id && usuario.rol !== 'admin') {
            const rolReal = await getRolFromDB(usuario.id);
            if (rolReal !== 'admin')
                return res.status(403).json({ success: false, message: 'Solo el trabajador asignado puede editar este pedido' });
        }

        const resultado = await VentaModel.editarDetalles(parseInt(id), {
            direccion_envio, notas_internas, fecha_estimada_entrega, numero_guia, paqueteria,
            trabajador_id: usuario.id!
        });

        res.json({ success: true, message: 'Detalles actualizados', data: resultado });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── MODIFICAR PRODUCTOS DE VENTA ─────────────────────────────

export const editarCantidadItem = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        const { id, item_id } = req.params;
        const { cantidad } = req.body;

        if (!cantidad || cantidad < 1)
            return res.status(400).json({ success: false, message: 'Cantidad inválida' });

        const venta = await VentaModel.getById(parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        if (venta.trabajador_id !== usuario.id && usuario.rol !== 'admin')
            return res.status(403).json({ success: false, message: 'Sin permiso para modificar este pedido' });

        const resultado = await VentaModel.editarCantidadItem(parseInt(item_id), parseInt(id), cantidad);
        res.json({ success: true, message: 'Cantidad actualizada', data: resultado });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const eliminarItemVenta = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        const { id, item_id } = req.params;

        const venta = await VentaModel.getById(parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        if (venta.trabajador_id !== usuario.id && usuario.rol !== 'admin')
            return res.status(403).json({ success: false, message: 'Sin permiso para modificar este pedido' });

        const resultado = await VentaModel.eliminarItem(parseInt(item_id), parseInt(id));
        res.json({ success: true, message: 'Producto eliminado del pedido', data: resultado });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DATOS DEL CLIENTE ────────────────────────────────────────

export const getClienteVenta = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const cliente = await VentaModel.getClienteByVenta(parseInt(id));
        if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        res.json({ success: true, data: cliente });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── TOMAR PEDIDO (asignación a trabajador) ───────────────────

export const tomarPedido = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        if (!usuario.id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const { id } = req.params;

        // Verificar que el pedido existe y está pendiente
        const venta = await VentaModel.getById(parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        if (venta.estado !== 'pendiente')
            return res.status(400).json({ success: false, message: 'Este pedido ya fue tomado o no está disponible' });

        if (venta.trabajador_id)
            return res.status(400).json({ 
                success: false, 
                message: `Este pedido ya está siendo atendido por ${venta.trabajador_nombre || 'otro trabajador'}` 
            });

        // Asignar trabajador con UPDATE atómico
        const result = await pool.query(`
            UPDATE ventas 
            SET trabajador_id = $1,
                actualizado_por = $1,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $2 AND (trabajador_id IS NULL) AND estado = 'pendiente'
            RETURNING *
        `, [usuario.id, parseInt(id)]);

        if (!result.rows.length)
            return res.status(409).json({ 
                success: false, 
                message: 'Otro trabajador tomó este pedido justo ahora. Recarga la lista.' 
            });

        res.json({ success: true, message: '✅ Pedido tomado correctamente. Ya puedes actualizarlo.', data: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── WEBHOOK MERCADOPAGO ───────────────────────────────────────

export const webhookMercadoPago = async (req: Request, res: Response) => {
    try {
        const { type, data } = req.body;

        if (type === 'payment' && data?.id) {
            const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
            if (!mpToken) return res.sendStatus(503);

            const pagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
                headers: { 'Authorization': `Bearer ${mpToken}` }
            });
            const pago = await pagoRes.json();

            if (pago.status === 'approved') {
                await VentaModel.confirmarPago(String(pago.id), pago.preference_id);
                console.log(`✅ Pago MP confirmado: payment_id=${pago.id}`);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error webhook MP:', error);
        res.sendStatus(500);
    }
};

// ── RECIBO PDF ────────────────────────────────────────────────

export const generarReciboPDF = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { token } = req.query;

        // Verificar token desde query string (para apertura directa en navegador)
        let usuarioId: number | null = null;
        let usuarioRol: string = 'cliente';

        if (token) {
            try {
                const { JWTService } = require('../../services/JWTService');
                const decoded = JWTService.verifyToken(token as string);
                usuarioId = decoded.userId;
                usuarioRol = decoded.rol || 'cliente';
            } catch {
                return res.status(401).json({ success: false, message: 'Token inválido' });
            }
        } else {
            const u = getUsuario(req);
            usuarioId = u.id;
            usuarioRol = u.rol;
        }

        if (!usuarioId) return res.status(401).json({ success: false, message: 'No autenticado' });

        const venta = await VentaModel.getById(parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        const esOwner = venta.creado_por === usuarioId;
        const esStaff = ['admin','trabajador'].includes(usuarioRol);
        if (!esOwner && !esStaff)
            return res.status(403).json({ success: false, message: 'Acceso denegado' });

        // Generar HTML del recibo
        const itemsHTML = (venta.items || []).map((item: any) => `
            <tr>
                <td>
                    <p class="prod-nombre">${item.producto_nombre}</p>
                    ${item.talla_medida ? `<p class="prod-detalle">Talla/Medida: ${item.talla_medida}</p>` : ''}
                    ${item.nota ? `<p class="prod-detalle">Nota: ${item.nota}</p>` : ''}
                </td>
                <td>${item.cantidad}</td>
                <td>$${parseFloat(item.precio_unitario).toLocaleString('es-MX')}</td>
                <td>$${parseFloat(item.subtotal).toLocaleString('es-MX')}</td>
            </tr>
        `).join('');

        const fechaFormato = new Date(venta.fecha_creacion).toLocaleString('es-MX', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'America/Mexico_City' });
        const fechaHoy = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric', timeZone:'America/Mexico_City' });

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo ${venta.folio} - Joyería Diana Laura</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@300;400;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Montserrat', Arial, sans-serif;
            color: #2c2c2c;
            background: #f9f6f7;
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 40px 20px;
        }

        .recibo {
            background: white;
            max-width: 720px;
            width: 100%;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 40px rgba(0,0,0,0.10);
        }

        /* ── Header ── */
        .header {
            background: linear-gradient(135deg, #0f0f12 0%, #1a1a2e 100%);
            color: white;
            padding: 40px 48px 32px;
            text-align: center;
            position: relative;
        }
        .header::after {
            content: '';
            display: block;
            height: 4px;
            background: linear-gradient(90deg, #ecb2c3, #d4899f, #ecb2c3);
            position: absolute;
            bottom: 0; left: 0; right: 0;
        }
        .header-emoji { font-size: 48px; margin-bottom: 12px; }
        .header h1 {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 0.02em;
            color: #fff;
            margin-bottom: 6px;
        }
        .header-sub {
            font-size: 13px;
            color: rgba(255,255,255,0.6);
            letter-spacing: 0.08em;
            margin-bottom: 16px;
        }
        .header-badge {
            display: inline-block;
            background: #ecb2c3;
            color: #0f0f12;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            padding: 6px 20px;
            border-radius: 20px;
        }

        /* ── Body ── */
        .body { padding: 40px 48px; }

        /* ── Info grid ── */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 32px;
        }
        .info-card {
            background: #faf8f9;
            border: 1px solid #f0e6ea;
            border-radius: 10px;
            padding: 20px;
        }
        .info-card h3 {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #ecb2c3;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f0e6ea;
        }
        .info-row { margin-bottom: 6px; }
        .info-label { font-size: 11px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .info-value { font-size: 13px; color: #2c2c2c; font-weight: 500; margin-top: 1px; }
        .estado-badge {
            display: inline-block;
            background: #ecb2c3;
            color: #0f0f12;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 12px;
            text-transform: capitalize;
        }

        /* ── Productos ── */
        .seccion-titulo {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #ecb2c3;
            margin-bottom: 14px;
            padding-bottom: 8px;
            border-bottom: 2px solid #f0e6ea;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 28px;
        }
        thead tr {
            background: #0f0f12;
        }
        thead th {
            padding: 12px 14px;
            font-size: 11px;
            font-weight: 700;
            color: #ecb2c3;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            text-align: left;
        }
        thead th:not(:first-child) { text-align: right; }
        tbody tr { border-bottom: 1px solid #f5eff1; }
        tbody tr:last-child { border-bottom: none; }
        tbody td {
            padding: 14px;
            font-size: 13px;
            color: #2c2c2c;
            vertical-align: middle;
        }
        tbody td:not(:first-child) { text-align: right; }
        .prod-nombre { font-weight: 600; }
        .prod-detalle { font-size: 11px; color: #999; margin-top: 2px; }

        /* ── Totales ── */
        .totales-wrap {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 32px;
        }
        .totales-tabla {
            width: 280px;
            background: #faf8f9;
            border: 1px solid #f0e6ea;
            border-radius: 10px;
            overflow: hidden;
        }
        .totales-fila {
            display: flex;
            justify-content: space-between;
            padding: 10px 16px;
            font-size: 13px;
            border-bottom: 1px solid #f0e6ea;
            color: #666;
        }
        .totales-fila:last-child {
            border-bottom: none;
            background: #0f0f12;
            color: white;
            font-size: 15px;
            font-weight: 700;
            padding: 14px 16px;
        }
        .totales-fila:last-child span:last-child { color: #ecb2c3; }

        /* ── Footer ── */
        .footer {
            background: #faf8f9;
            border-top: 2px solid #f0e6ea;
            padding: 28px 48px;
            text-align: center;
        }
        .footer-titulo {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 16px;
            color: #0f0f12;
            margin-bottom: 8px;
        }
        .footer-sub { font-size: 12px; color: #aaa; line-height: 1.6; }
        .footer-folio { font-size: 11px; color: #ccc; margin-top: 12px; font-family: monospace; }

        /* ── Print ── */
        @media print {
            body { background: white; padding: 0; }
            .recibo { box-shadow: none; border-radius: 0; }
            .btn-imprimir { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="recibo">

        <!-- Header -->
        <div class="header">
            <div class="header-emoji">💎</div>
            <h1>Joyería Diana Laura</h1>
            <p class="header-sub">Tu tienda de joyas exclusivas</p>
            <span class="header-badge">Recibo de Compra</span>
        </div>

        <div class="body">

            <!-- Info grid -->
            <div class="info-grid">
                <div class="info-card">
                    <h3>Datos del pedido</h3>
                    <div class="info-row">
                        <p class="info-label">Folio</p>
                        <p class="info-value">${venta.folio}</p>
                    </div>
                    <div class="info-row">
                        <p class="info-label">Fecha</p>
                        <p class="info-value">${fechaFormato}</p>
                    </div>
                    <div class="info-row">
                        <p class="info-label">Estado</p>
                        <span class="estado-badge">${venta.estado}</span>
                    </div>
                </div>
                <div class="info-card">
                    <h3>Cliente</h3>
                    <div class="info-row">
                        <p class="info-label">Nombre</p>
                        <p class="info-value">${venta.cliente_nombre_completo}</p>
                    </div>
                    <div class="info-row">
                        <p class="info-label">Email</p>
                        <p class="info-value">${venta.cliente_email}</p>
                    </div>
                </div>
            </div>

            <!-- Productos -->
            <p class="seccion-titulo">Productos</p>
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>Precio unit.</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <!-- Totales -->
            <div class="totales-wrap">
                <div class="totales-tabla">
                    <div class="totales-fila"><span>Subtotal</span><span>$${parseFloat(venta.subtotal).toLocaleString('es-MX')} MXN</span></div>
                    <div class="totales-fila"><span>IVA (16%)</span><span>$${parseFloat(venta.iva).toLocaleString('es-MX')} MXN</span></div>
                    <div class="totales-fila"><span>Total</span><span>$${parseFloat(venta.total).toLocaleString('es-MX')} MXN</span></div>
                </div>
            </div>

        </div>

        <!-- Footer -->
        <div class="footer">
            <p class="footer-titulo">¡Gracias por tu compra! 💎</p>
            <p class="footer-sub">
                Tu pedido está siendo atendido con todo el cuidado que mereces.<br>
                Cualquier duda contáctanos en <strong>info@dianaalaura.com</strong>
            </p>
            <p class="footer-folio">Generado el ${fechaHoy} · ${venta.folio}</p>
        </div>
    </div>
</body>
</html>`;

        // Retornar HTML — el frontend lo convierte a PDF con la API del navegador
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};