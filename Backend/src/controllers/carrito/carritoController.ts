// Ruta: Backend/src/controllers/carrito/carritoController.ts
import { Request, Response } from 'express';
import { CarritoModel, VentaModel } from '../../models/carritoModel';
import { pool } from '../../config/database';

const getUsuario = (req: Request) => {
    const user = (req as any).user;
    // El JWT guarda el ID de PostgreSQL en el campo "userId"
    const id = user?.userId || user?.dbId || user?.id || null;
    return {
        id,
        email:  user?.email || '',
        nombre: user?.nombre || '',
        rol:    user?.rol?.toLowerCase() || 'cliente'
    };
};

// Helper para obtener el rol real desde BD cuando no está en el token
const getRolFromDB = async (usuario_id: number): Promise<string> => {
    try {
        const { pool } = require('../../config/database');
        const result = await pool.query(
            'SELECT rol FROM usuarios WHERE id = $1', [usuario_id]
        );
        return result.rows[0]?.rol?.toLowerCase() || 'cliente';
    } catch { return 'cliente'; }
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

// ── PEDIDOS (ventas) ─────────────────────────────────────────

export const crearPedido = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        if (!usuario.id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const { direccion_envio, notas_cliente } = req.body;
        if (!direccion_envio)
            return res.status(400).json({ success: false, message: 'Dirección de envío requerida' });

        // Obtener carrito
        const items = await CarritoModel.getByUsuario(usuario.id);
        if (!items.length)
            return res.status(400).json({ success: false, message: 'El carrito está vacío' });

        // Obtener o crear cliente
        const cliente_id = await VentaModel.getOrCreateCliente(usuario.id, usuario.email, usuario.nombre);

        // Obtener método de pago
        const metodo_pago_id = await VentaModel.getMetodoPagoId();
        if (!metodo_pago_id)
            return res.status(503).json({ success: false, message: 'Método de pago no configurado' });

        // Obtener códigos de productos
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

        // Solo el dueño o admin/trabajador puede verlo
        // creado_por guarda el usuario_id del creador
        const esOwner = venta.creado_por === usuario.id;
        const esStaff = ['admin','trabajador'].includes(usuario.rol);
        if (!esOwner && !esStaff) {
            // Intentar obtener rol real de BD por si no está en el token
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

        const venta = await VentaModel.updateEstado(parseInt(id), estado, usuario.id!, notas_internas);
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

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

        const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!mpToken) return res.status(503).json({ success: false, message: 'Pasarela de pago no configurada' });

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

        // Guardar en transacciones_pago
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
        console.error('Error creando preferencia MP:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

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
                console.log(`✅ Pago confirmado: payment_id=${pago.id}`);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook MP:', error);
        res.sendStatus(500);
    }
};