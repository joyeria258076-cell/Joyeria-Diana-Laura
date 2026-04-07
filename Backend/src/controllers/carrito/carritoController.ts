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
        const result = await pool.query('SELECT rol FROM seguridad.usuarios WHERE id = $1', [usuario_id]);
        return result.rows[0]?.rol?.toLowerCase() || 'cliente';
    } catch { return 'cliente'; }
};

// ✅ Helper para mostrar nombres legibles de estados
const labelEstado = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

// ── Descontar stock al confirmar pedido ───────────────────────
const descontarStock = async (venta_id: number): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const items = await client.query(`
            SELECT producto_id, cantidad FROM ventas.detalle_ventas WHERE venta_id = $1
        `, [venta_id]);

        for (const item of items.rows) {
            // ✅ CORREGIDO: agregar esquema catalogo
            const prod = await client.query(
                `SELECT stock_actual FROM catalogo.productos WHERE id = $1 FOR UPDATE`, [item.producto_id]
            );
            if (!prod.rows.length) continue;

            const stockActual = prod.rows[0].stock_actual;
            const nuevoStock  = Math.max(0, stockActual - item.cantidad);

            await client.query(`
                UPDATE catalogo.productos 
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
    // ✅ CORREGIDO: agregar esquema ventas y catalogo
    const items = await pool.query(`
        SELECT producto_id, cantidad FROM ventas.detalle_ventas WHERE venta_id = $1
    `, [venta_id]);

    for (const item of items.rows) {
        await pool.query(`
            UPDATE catalogo.productos
            SET stock_actual = stock_actual + $1, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [item.cantidad, item.producto_id]);
        console.log(`♻️ Stock restaurado: producto ${item.producto_id} +${item.cantidad}`);
    }
};

// ── CALCULAR FECHA DE ENTREGA ESTIMADA SUMANDO DIAS HABILES───────────────────────────────────────
const calcularFechaEntrega = async (diasDefault: number = 7): Promise<string> => {
    try {
        const result = await pool.query(
            `SELECT valor FROM configuracion WHERE clave = 'dias_entrega_default'`
        );
        const dias = result.rows.length > 0 ? parseInt(result.rows[0].valor) : diasDefault;

        // ✅ Usar hora México para el cálculo
        const ahoraMx = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
        //console.log('📅 Fecha base México:', ahoraMx.toISOString(), 'Día semana:', ahoraMx.getDay());
        const fecha = new Date(ahoraMx);
        let diasContados = 0;
        while (diasContados < dias) {
            fecha.setDate(fecha.getDate() + 1);
            diasContados++; // ✅ Cuenta todos los días incluyendo fines de semana
        }
        return `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
    } catch {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + 7);
        return fecha.toISOString().split('T')[0];
    }
};

// ── GENERAR CODIGO DE ENTREGA ÚNICO PARA CADA PEDIDO (6 CARACTERES ALFANUMÉRICOS) ───────────────────────────────────────
const generarCodigoEntrega = async (): Promise<string> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I,O,0,1 para evitar confusión
    let codigo = '';
    let intentos = 0;
    while (intentos < 10) {
        codigo = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        // Verificar que no exista
        const existe = await pool.query(
            `SELECT id FROM ventas WHERE codigo_entrega = $1`, [codigo]
        );
        if (existe.rows.length === 0) return codigo;
        intentos++;
    }
    return codigo;
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

        // ✅ CORREGIDO: agregar esquema catalogo
        const prod = await pool.query(
            `SELECT stock_actual, activo FROM catalogo.productos WHERE id = $1`, [producto_id]
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

        const { direccion_envio, notas_cliente, metodo_pago_id } = req.body;
        if (!direccion_envio)
            return res.status(400).json({ success: false, message: 'Dirección de envío requerida' });

        const items = await CarritoModel.getByUsuario(usuario.id);
        if (!items.length)
            return res.status(400).json({ success: false, message: 'El carrito está vacío' });

        const cliente_id = await VentaModel.getOrCreateCliente(usuario.id, usuario.email, usuario.nombre);
        if (!metodo_pago_id)
            return res.status(400).json({ success: false, message: 'Método de pago requerido' });
        const metodoPago = await VentaModel.getMetodoPagoById(parseInt(metodo_pago_id));
        if (!metodoPago)
            return res.status(400).json({ success: false, message: 'Método de pago inválido' });

        // ✅ CORREGIDO: agregar esquema catalogo
        const productIds = items.map(i => i.producto_id);
        const prodsResult = await pool.query(
            `SELECT id, codigo, nombre, imagen_principal FROM catalogo.productos WHERE id = ANY($1)`,
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

        // ✅ Verificar stock disponible antes de crear el pedido
        for (const item of itemsPedido) {
            const stockCheck = await pool.query(
                `SELECT stock_actual, nombre FROM productos WHERE id = $1`, [item.producto_id]
            );
            if (!stockCheck.rows.length) 
                return res.status(400).json({ success: false, message: `Producto no encontrado` });
            if (stockCheck.rows[0].stock_actual < item.cantidad)
                return res.status(400).json({ 
                    success: false, 
                    message: `Stock insuficiente para "${stockCheck.rows[0].nombre}". Solo quedan ${stockCheck.rows[0].stock_actual} unidades.` 
                });
        }

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
        console.log('FECHA RAW:', ventas[0]?.fecha_creacion);
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

        const estadosValidos = ['pendiente','confirmado','en_preparacion','enviado','entregado','cancelado'];
        if (!estadosValidos.includes(estado))
            return res.status(400).json({ success: false, message: 'Estado inválido' });

        const ventaActual = await VentaModel.getById(parseInt(id));
        if (!ventaActual) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        // ✅ No permitir regresar a estados anteriores
        const ORDEN_ESTADOS = ['pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado'];
        const indexActual = ORDEN_ESTADOS.indexOf(ventaActual.estado);
        const indexNuevo  = ORDEN_ESTADOS.indexOf(estado);
        if (indexActual >= 0 && indexNuevo >= 0 && indexNuevo < indexActual) {
            return res.status(400).json({
                success: false,
                message: `No puedes regresar el pedido de "${labelEstado(ventaActual.estado)}" a "${labelEstado(estado)}". Solo puedes avanzar el estado.`
            });
        }

        // ✅ Validar que el cliente haya pagado antes de marcar como enviado o entregado
        if (['enviado', 'entregado'].includes(estado) && ventaActual.estado_pago !== 'aprobado') {
            return res.status(400).json({ 
                success: false, 
                message: `No puedes marcar como "${labelEstado(estado)}" — el cliente aún no ha realizado el pago.`
            });
        }

        const estadoAnterior = ventaActual.estado;

        const venta = await VentaModel.updateEstado(parseInt(id), estado, usuario.id!, notas_internas);

        // Stock se descuenta al pagar (en webhook), no al confirmar manualmente
        if (estado === 'cancelado' && !['pendiente', 'cancelado'].includes(estadoAnterior)) {
            try {
                await restaurarStock(parseInt(id));
                console.log(`✅ Stock restaurado para venta ${id}`);
            } catch (stockErr) {
                console.error('⚠️ Error restaurando stock:', stockErr);
            }
        }

        res.json({ success: true, message: `Pedido actualizado a: ${labelEstado(estado)}`, data: venta });
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

        // ✅ Corregido: estados válidos para pagar
        if (!['confirmado','en_preparacion','enviado'].includes(venta.estado))
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

        const backUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // ✅ FIX: isLocal depende solo de BACKEND_URL
        const isLocal = (process.env.BACKEND_URL || '').includes('localhost');

        const body: any = {
            items,
            payer:              { email: usuario.email },
            external_reference: String(venta.id),
            back_urls: {
                success: `${backUrl}/pedidos?pago=exitoso&pedido=${venta.id}`,
                failure: `${backUrl}/pedidos?pago=fallido&pedido=${venta.id}`,
                pending: `${backUrl}/pedidos?pago=pendiente&pedido=${venta.id}`
            },
            statement_descriptor: 'Joyeria Diana Laura'
        };

        if (!isLocal) {
            //body.auto_return = 'approved';
            body.notification_url = `${process.env.BACKEND_URL}/api/carrito/webhook/mercadopago`;
        }

        console.log(`🔔 notification_url: ${body.notification_url || 'NO CONFIGURADA (isLocal=true)'}`);

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

        // ✅ Corregido: estados válidos para pagar
        if (!['confirmado','en_preparacion','enviado'].includes(venta.estado))
            return res.status(400).json({ success: false, message: 'El pedido aún no está confirmado' });

        const ppClientId = process.env.PAYPAL_CLIENT_ID;
        const ppSecret   = process.env.PAYPAL_CLIENT_SECRET;

        if (!ppClientId || !ppSecret)
            return res.status(503).json({ success: false, message: 'PayPal no configurado' });

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

        const backUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

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

            try {
                await descontarStock(venta_id);

                // ✅ Generar código de entrega
                const codigoEntrega = await generarCodigoEntrega();
                await pool.query(`
                    UPDATE ventas SET codigo_entrega = $1 WHERE id = $2 AND codigo_entrega IS NULL
                `, [codigoEntrega, venta_id]);

                // ✅ Calcular fecha estimada al pagar con PayPal
                const fechaEntrega = await calcularFechaEntrega();
                await pool.query(`
                    UPDATE ventas SET fecha_estimada_entrega = $1 WHERE id = $2 AND fecha_estimada_entrega IS NULL
                `, [fechaEntrega, parseInt(String(venta_id))]);

                console.log(`📦 Stock descontado por pago PayPal: venta_id=${venta_id}`);
            } catch (stockErr) {
                console.error('⚠️ Error descontando stock PayPal:', stockErr);
            }
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

        const venta = await VentaModel.getById(parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        if (venta.estado !== 'pendiente')
            return res.status(400).json({ success: false, message: 'Este pedido ya fue tomado o no está disponible' });

        if (venta.trabajador_id)
            return res.status(400).json({ 
                success: false, 
                message: `Este pedido ya está siendo atendido por ${venta.trabajador_nombre || 'otro trabajador'}` 
            });

        // ✅ CORREGIDO: agregar esquema ventas
        const result = await pool.query(`
            UPDATE ventas.ventas 
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
        console.log('🔔 Webhook MP recibido:', JSON.stringify(req.body));

        const { type, data } = req.body;

        if (type === 'payment' && data?.id) {
            const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
            if (!mpToken) return res.sendStatus(503);

            const pagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
                headers: { 'Authorization': `Bearer ${mpToken}` }
            });
            const pago = await pagoRes.json();

            console.log(`💳 Pago MP: id=${pago.id} status=${pago.status} external_ref=${pago.external_reference}`);

            if (pago.status === 'approved' && pago.external_reference) {
                const venta_id = parseInt(pago.external_reference);
                await VentaModel.confirmarPago(String(pago.id), venta_id);
                // ✅ Stock se descuenta al pagar, no al confirmar manualmente
                try {
                    await descontarStock(venta_id);

                    // ✅ Generar código de entrega
                    const codigoEntrega = await generarCodigoEntrega();
                    await pool.query(`
                        UPDATE ventas SET codigo_entrega = $1 WHERE id = $2 AND codigo_entrega IS NULL
                    `, [codigoEntrega, venta_id]);

                    // ✅ Calcular fecha estimada al pagar con MP
                    const fechaEntrega = await calcularFechaEntrega();
                    await pool.query(`
                        UPDATE ventas SET fecha_estimada_entrega = $1 WHERE id = $2 AND fecha_estimada_entrega IS NULL
                    `, [fechaEntrega, venta_id]);

                    console.log(`📦 Stock descontado por pago MP: venta_id=${venta_id}`);
                } catch (stockErr) {
                    console.error('⚠️ Error descontando stock en webhook:', stockErr);
                }
                console.log(`✅ Pago MP confirmado: payment_id=${pago.id} venta_id=${venta_id}`);
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

        const fechaStr = venta.fecha_creacion;
        const fechaUTC = /Z|[+-]\d{2}:?\d{2}$/.test(fechaStr) ? fechaStr : fechaStr.replace(' ', 'T') + 'Z';
        const fechaFormato = new Intl.DateTimeFormat('es-MX', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Mexico_City'
        }).format(new Date(fechaUTC));
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

        .body { padding: 40px 48px; }

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
        thead tr { background: #0f0f12; }
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

        @media print {
            body { background: white; padding: 0; }
            .recibo { box-shadow: none; border-radius: 0; }
        }
    </style>
</head>
<body>
    <div class="recibo">
        <div class="header">
            <div class="header-emoji">💎</div>
            <h1>Joyería Diana Laura</h1>
            <p class="header-sub">Tu tienda de joyas exclusivas</p>
            <span class="header-badge">Recibo de Compra</span>
        </div>

        <div class="body">
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
                    <div class="info-row">
                        <p class="info-label">Método de pago</p>
                        <p class="info-value">${venta.metodo_pago_nombre || 'No especificado'}</p>
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

            <div class="totales-wrap">
                <div class="totales-tabla">
                    <div class="totales-fila"><span>Subtotal</span><span>$${parseFloat(venta.subtotal).toLocaleString('es-MX')} MXN</span></div>
                    <div class="totales-fila"><span>IVA (16%)</span><span>$${parseFloat(venta.iva).toLocaleString('es-MX')} MXN</span></div>
                    <div class="totales-fila"><span>Total</span><span>$${parseFloat(venta.total).toLocaleString('es-MX')} MXN</span></div>
                </div>
            </div>
        </div>

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

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const confirmarPagoEfectivo = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        const { id } = req.params;
        const venta = await VentaModel.getById(parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        if (venta.metodo_pago_codigo === 'transferencia' && !venta.comprobante_transferencia_url) {
            return res.status(400).json({ 
                success: false, 
                message: 'El cliente aún no ha subido el comprobante de transferencia.' 
            });
        }
        
        const { fecha_estimada } = req.body;
        const transactionId = `MANUAL-${usuario.id}-${Date.now()}`;

        // ✅ Insertar transacción aprobada directamente
        await pool.query(`
            INSERT INTO transacciones_pago (
                venta_id, metodo_pago_id, monto, moneda, monto_neto,
                estado, transaction_id, fecha_aprobacion,
                fecha_creacion, fecha_actualizacion
            ) VALUES ($1, $2, $3, 'MXN', $3, 'aprobado', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [parseInt(id), venta.metodo_pago_id, parseFloat(venta.total), transactionId]);

        // ✅ Avanzar estado a en_preparacion
        await pool.query(`
            UPDATE ventas 
            SET estado = 'en_preparacion', fecha_actualizacion = CURRENT_TIMESTAMP 
            WHERE id = $1
        `, [parseInt(id)]);

        // ✅ Generar código de entrega
        const codigoEntrega = await generarCodigoEntrega();
        await pool.query(`
            UPDATE ventas SET codigo_entrega = $1 WHERE id = $2 AND codigo_entrega IS NULL
        `, [codigoEntrega, parseInt(id)]);

        // ✅ Calcular y guardar fecha estimada de entrega
        const fechaEntrega = fecha_estimada || await calcularFechaEntrega();
        //console.log(`📅 Fecha entrega calculada: ${fechaEntrega}`);
        await pool.query(`
            UPDATE ventas SET fecha_estimada_entrega = $1 WHERE id = $2 AND fecha_estimada_entrega IS NULL
        `, [fechaEntrega, parseInt(id)]);
        
        // ✅ Descontar stock al confirmar pago manual
        try {
            await descontarStock(parseInt(id));
            console.log(`📦 Stock descontado por pago manual: venta_id=${id}`);
        } catch (stockErr) {
            console.error('⚠️ Error descontando stock:', stockErr);
        }

        res.json({ success: true, message: 'Pago confirmado correctamente' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const subirComprobante = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        const { id } = req.params;

        const venta = await VentaModel.getById(parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        if (venta.creado_por !== usuario.id)
            return res.status(403).json({ success: false, message: 'Acceso denegado' });
        if (venta.metodo_pago_codigo !== 'transferencia')
            return res.status(400).json({ success: false, message: 'Este pedido no es por transferencia' });

        if (!req.file)
            return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' });

        // Subir a Cloudinary
        const cloudinary = require('../../config/cloudinary').default;
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'joyeria-diana-laura/comprobantes',
                    public_id: `comprobante-${venta.folio}-${Date.now()}`,
                    resource_type: 'image',
                },
                (error: any, result: any) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.file!.buffer);
        });

        // Guardar URL en la BD
        await pool.query(`
            UPDATE ventas 
            SET comprobante_transferencia_url = $1, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [uploadResult.secure_url, parseInt(id)]);

        console.log(`📎 Comprobante subido para venta ${id}: ${uploadResult.secure_url}`);

        res.json({
            success: true,
            message: 'Comprobante subido correctamente. El trabajador lo revisará pronto.',
            data: { url: uploadResult.secure_url }
        });
    } catch (error: any) {
        console.error('Error subiendo comprobante:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── ENDPOINT DE POLLING PARA NOTIFICACIONES ───────────────────
export const getEstadosPedidosCliente = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        if (!usuario.id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const result = await pool.query(`
            SELECT 
                v.id,
                v.folio,
                v.estado,
                v.fecha_actualizacion,
                COALESCE(
                    (SELECT tp.estado FROM transacciones_pago tp
                     WHERE tp.venta_id = v.id
                     ORDER BY tp.fecha_creacion DESC LIMIT 1),
                    'pendiente'
                ) AS estado_pago
            FROM ventas v
            WHERE v.creado_por = $1
            AND v.estado NOT IN ('cancelado', 'entregado')
            ORDER BY v.fecha_creacion DESC
        `, [usuario.id]);

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const validarCodigoEntrega = async (req: Request, res: Response) => {
    try {
        const { codigo } = req.body;
        if (!codigo) return res.status(400).json({ success: false, message: 'Código requerido' });

        const result = await pool.query(`
            SELECT v.id, v.folio, v.cliente_nombre_completo, v.estado, v.codigo_entrega_usado
            FROM ventas v
            WHERE v.codigo_entrega = $1
        `, [codigo.toUpperCase().trim()]);

        if (!result.rows.length)
            return res.status(404).json({ success: false, message: '❌ Código inválido — no corresponde a ningún pedido' });

        const venta = result.rows[0];

        if (venta.codigo_entrega_usado)
            return res.status(400).json({ success: false, message: '⚠️ Este código ya fue usado' });

        if (venta.estado === 'entregado')
            return res.status(400).json({ success: false, message: '⚠️ Este pedido ya fue entregado' });

        res.json({ success: true, data: venta });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const confirmarEntregaCodigo = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        const { codigo } = req.body;

        const result = await pool.query(`
            SELECT id, folio, estado, codigo_entrega_usado FROM ventas WHERE codigo_entrega = $1
        `, [codigo.toUpperCase().trim()]);

        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Código inválido' });

        const venta = result.rows[0];
        if (venta.codigo_entrega_usado)
            return res.status(400).json({ success: false, message: 'Código ya utilizado' });

        // ✅ Marcar como entregado y código usado
        await pool.query(`
            UPDATE ventas 
            SET estado = 'entregado',
                codigo_entrega_usado = TRUE,
                actualizado_por = $1,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [usuario.id, venta.id]);

        res.json({ success: true, message: '✅ Entrega confirmada correctamente', data: { folio: venta.folio } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};