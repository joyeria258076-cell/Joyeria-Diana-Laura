// Ruta: Backend/src/controllers/carrito/carritoController.ts
import { Request, Response } from 'express';
import { CarritoModel, VentaModel } from '../../models/carritoModel';
import { pool } from '../../config/database';
import crypto from 'crypto';
import axios from 'axios';
import { C, SITIO_URL, dinero, escapar, fila, tablaFilas, tarjeta, lineaTiempo, layoutCorreo } from '../../utils/plantillaCorreo';
import { verificarYCapturarPayPal } from '../../utils/paypalVerificacion';

import { expirarSiToca } from '../../services/expiracionPedidosService';
import { validarEleccion, resumenDe } from '../../services/opcionesPersonalizacionService';

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

// ✅ Helper para mostrar nombres legibles de estados
const labelEstado = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

// ── Notificación por email al cambiar el estado de un pedido ──
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const REMITENTE_EMAIL = process.env.BREVO_SENDER_EMAIL || '';
const REMITENTE_NOMBRE = process.env.BREVO_SENDER_NOMBRE || 'Joyeria Diana Laura';

// Texto y color de cada evento del pedido (colores de estado de la app)
const ESTADO_NOTIFICACION_META: Record<string, { color: string; titulo: string; mensaje: string }> = {
    pendiente:      { color: C.aviso,  titulo: 'Tu pedido está *pendiente*', mensaje: 'Tu pedido está pendiente de confirmación.' },
    confirmado:     { color: C.info,   titulo: 'Pedido *confirmado*', mensaje: 'Confirmamos tu pedido y ya lo estamos procesando.' },
    en_preparacion: { color: C.rosa,   titulo: 'Preparando tu *pieza*', mensaje: 'Estamos preparando tu pedido con mucho cuidado.' },
    enviado:        { color: C.lila,   titulo: 'Tu pedido va en *camino*', mensaje: 'Tu pedido ya salió y pronto estará contigo.' },
    entregado:      { color: C.exito,  titulo: '¡Pedido *entregado*!', mensaje: 'Tu pedido fue entregado. Gracias por confiar en nosotros.' },
    cancelado:      { color: C.error,  titulo: 'Pedido *cancelado*', mensaje: 'Tu pedido fue cancelado. Si tienes dudas, escríbenos por WhatsApp.' },
    expirado:       { color: C.suave,  titulo: 'Tu pedido *expiró*', mensaje: 'Tu pedido expiró porque no tuvo movimiento. Si aún lo quieres, puedes volver a hacerlo desde el catálogo.' },
    // Eventos que no son un cambio de estado
    recibido:       { color: C.rosa,   titulo: 'Recibimos tu *pedido*', mensaje: 'Un trabajador lo revisará y te avisaremos en cuanto lo tome.' },
    tomado:         { color: C.info,   titulo: 'Ya estamos con tu *pedido*', mensaje: 'Un miembro de nuestro equipo ya está atendiendo tu pedido.' },
};

// Eventos que en la línea de tiempo cuentan como el estado "pendiente"
const EVENTO_A_ESTADO: Record<string, string> = { recibido: 'pendiente', tomado: 'pendiente' };
const ORDEN_ESTADOS_TRACKER = ['pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado'];
const TITULO_PASO: Record<string, string> = {
    pendiente: 'Pedido recibido', confirmado: 'Pago confirmado', en_preparacion: 'Preparando tu pedido',
    enviado: 'En camino', entregado: 'Entregado',
};

function construirHtmlNotificacionEstado(venta: any, estado: string, nota?: string): string {
    const meta = ESTADO_NOTIFICACION_META[estado] || { color: C.rosa, titulo: 'Tu pedido se *actualizó*', mensaje: 'El estado de tu pedido cambió.' };
    const nombrePila = (venta.cliente_nombre_completo || venta.cliente_nombre_reg || '').split(' ')[0];
    const items: any[] = venta.items || [];
    const ETIQUETA: Record<string, string> = { recibido: 'Nuevo pedido', tomado: 'En atención', pendiente: 'Pendiente', confirmado: 'Confirmado', en_preparacion: 'En preparación', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado', expirado: 'Expirado' };
    const etiqueta = ETIQUETA[estado] || labelEstado(estado);

    // Línea de tiempo vertical (no aplica a cancelado/expirado)
    let seguimiento = '';
    if (estado !== 'cancelado' && estado !== 'expirado') {
        const indexActual = ORDEN_ESTADOS_TRACKER.indexOf(EVENTO_A_ESTADO[estado] || estado);
        seguimiento = tarjeta(`
            <p style="margin:0 0 14px; font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:12px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:${C.suave};">Seguimiento</p>
            ${lineaTiempo(ORDEN_ESTADOS_TRACKER.map((paso, i) => ({
                titulo: TITULO_PASO[paso],
                estado: i < indexActual ? 'hecho' : i === indexActual ? 'actual' : 'pendiente',
            })))}`);
    }

    const filasItems = items.map(it =>
        fila(`${escapar(it.producto_nombre)} <span style="color:${C.suave};">× ${it.cantidad}</span>${it.opciones_resumen ? `<br><span style="font-size:12px;color:${C.suave};">${escapar(it.opciones_resumen)}</span>` : ''}`, dinero(it.subtotal))).join('');

    const resumen = tarjeta(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr>
          <td style="font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:12px; color:${C.suave};">Pedido</td>
          <td align="right" style="font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:16px; font-weight:700; color:${C.texto};">${escapar(venta.folio)}</td>
        </tr></table>
        ${tablaFilas(filasItems + fila('Total', dinero(venta.total), { fuerte: true, color: C.rosa }))}`, { acento: meta.color });

    const envio = venta.dir_calle ? tarjeta(`
        <p style="margin:0 0 4px; font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:12px; font-weight:600; color:${C.suave};">Se entrega en</p>
        <p style="margin:0; font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:14px; line-height:1.5; color:${C.texto};">
          ${escapar(`${venta.dir_calle} ${venta.dir_numero || ''}, ${venta.dir_colonia}, ${venta.dir_ciudad}, ${venta.dir_estado}, CP ${venta.dir_codigo_postal}`)}
        </p>`) : '';

    return layoutCorreo({
        preheader: `${ESTADO_NOTIFICACION_META[estado]?.mensaje || 'Tu pedido se actualizó.'} Folio ${venta.folio}.`,
        etiqueta: { texto: etiqueta, color: meta.color },
        titulo: meta.titulo,
        nombre: nombrePila,
        mensaje: meta.mensaje,
        contenido: (nota ? tarjeta(`
            <p style="margin:0 0 6px; font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:${C.info};">Mensaje de la tienda</p>
            <p style="margin:0; font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:14.5px; line-height:1.55; color:${C.texto}; white-space:pre-wrap;">${escapar(nota)}</p>`, { acento: C.info }) : '') + seguimiento + resumen + envio,
        botonTexto: estado === 'entregado' ? 'Calificar mis piezas' : 'Ver mi pedido',
        botonUrl: `${SITIO_URL}/pedidos`,
        notaPie: 'Te avisaremos por correo cada vez que tu pedido avance.',
    });
}

const enviarNotificacionEstadoPedido = async (venta: any, estado: string, asunto?: string, nota?: string): Promise<void> => {
    const destinatarioEmail = venta.cliente_email || venta.cliente_email_reg;
    if (!destinatarioEmail) return;

    try {
        await axios.post(
            BREVO_ENDPOINT,
            {
                sender: { name: REMITENTE_NOMBRE, email: REMITENTE_EMAIL },
                to: [{ email: destinatarioEmail, name: venta.cliente_nombre_completo || venta.cliente_nombre_reg || '' }],
                subject: asunto || `Tu pedido ${venta.folio} está: ${labelEstado(estado)}`,
                htmlContent: construirHtmlNotificacionEstado(venta, estado, nota),
            },
            {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        );
    } catch (err: any) {
        console.error('⚠️ Error enviando notificación de estado de pedido:', err.response?.data || err.message);
    }
};

// ── Descontar stock al confirmar pedido ───────────────────────
const descontarStock = async (venta_id: number): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const items = await client.query(`
            SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1
        `, [venta_id]);

        for (const item of items.rows) {
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

// ── CALCULAR FECHA DE ENTREGA ESTIMADA SUMANDO DIAS HABILES───────────────────────────────────────
const calcularFechaEntrega = async (diasDefault: number = 7): Promise<string> => {
    try {
        const result = await pool.query(
            `SELECT valor FROM configuracion WHERE clave = 'dias_entrega_default'`
        );
        const dias = result.rows.length > 0 ? Number.parseInt(result.rows[0].valor) : diasDefault;

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
        codigo = Array.from({ length: 6 }, () => chars[crypto.randomInt(0, chars.length)]).join('');
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

        // Verificar si la promo activa tiene monto mínimo y si el carrito lo cumple
        // (misma restriccion por cliente/segmento que en CarritoModel.getByUsuario, para
        // no mostrar el aviso de "monto minimo" de una promocion que este usuario no puede usar)
        const totalBase = items.reduce((s, i) => s + Number.parseFloat(i.precio_venta) * i.cantidad, 0);
        const promoMin = await pool.query(`
            SELECT monto_minimo_compra, nombre FROM promociones pr
            WHERE activo = true AND fecha_inicio <= NOW() AND fecha_fin >= NOW()
              AND tipo IN ('porcentaje', 'monto_fijo')
              AND monto_minimo_compra IS NOT NULL
              AND (
                  NOT EXISTS (SELECT 1 FROM cupones_clientes cc WHERE cc.promocion_id = pr.id)
                  OR EXISTS (
                      SELECT 1 FROM cupones_clientes cc
                      JOIN clientes cl ON cl.id = cc.cliente_id
                      WHERE cc.promocion_id = pr.id AND cl.user_id = $1
                  )
              )
            ORDER BY valor_descuento DESC LIMIT 1
        `, [id]);
        let promoNoAplica: { nombre: string; minimo: number } | null = null;
        if (promoMin.rows.length > 0) {
            const minimo = Number.parseFloat(promoMin.rows[0].monto_minimo_compra);
            if (totalBase < minimo) {
                items.forEach(i => { i.precio_promocion = null; });
                promoNoAplica = { nombre: promoMin.rows[0].nombre, minimo };
            }
        }

        const total = items.reduce((sum, item) => {
            const precio = Number.parseFloat(item.precio_promocion ?? item.precio_oferta ?? item.precio_venta);
            return sum + (precio * item.cantidad);
        }, 0);

        res.json({ success: true, data: { items, total, count: items.length, promo_no_aplica: promoNoAplica } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const agregarAlCarrito = async (req: Request, res: Response) => {
    try {
        const { id, email, nombre } = getUsuario(req);
        if (!id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const { producto_id, talla_medida, nota, solicitud_personalizacion_id, opciones } = req.body;
        if (!producto_id) return res.status(400).json({ success: false, message: 'producto_id requerido' });
        const cantidad = Number(req.body.cantidad ?? 1);
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99)
            return res.status(400).json({ success: false, message: 'Cantidad inválida' });

        const prod = await pool.query(
            `SELECT stock_actual, activo FROM productos WHERE id = $1`, [producto_id]
        );
        if (!prod.rows.length || !prod.rows[0].activo)
            return res.status(404).json({ success: false, message: 'Producto no disponible' });
        // Se cuenta también lo que ya tiene en el carrito de ese producto
        const enCarrito = await pool.query(
            `SELECT COALESCE(SUM(cantidad), 0)::int AS n FROM carrito WHERE usuario_id = $1 AND producto_id = $2`, [id, producto_id]
        );
        if (prod.rows[0].stock_actual < cantidad + enCarrito.rows[0].n)
            return res.status(400).json({ success: false, message: `Stock insuficiente: solo hay ${prod.rows[0].stock_actual} disponible(s) y ya tienes ${enCarrito.rows[0].n} en el carrito` });

        // Producto personalizado ya aprobado por un trabajador: se agrega ligado
        // a esa solicitud especifica (1 pieza, no se combina con otros items).
        if (solicitud_personalizacion_id) {
            const cliente_id = await VentaModel.getOrCreateCliente(id, email, nombre);
            const sol = await pool.query(
                `SELECT id, producto_id, estado, utilizada FROM solicitudes_personalizacion WHERE id = $1 AND cliente_id = $2`,
                [solicitud_personalizacion_id, cliente_id]
            );
            if (!sol.rows.length)
                return res.status(404).json({ success: false, message: 'Solicitud de personalización no encontrada' });
            if (sol.rows[0].producto_id !== Number.parseInt(producto_id))
                return res.status(400).json({ success: false, message: 'La solicitud no corresponde a este producto' });
            if (sol.rows[0].estado !== 'aprobada')
                return res.status(400).json({ success: false, message: 'Esta solicitud aún no ha sido aprobada' });
            if (sol.rows[0].utilizada)
                return res.status(400).json({ success: false, message: 'Esta solicitud ya fue utilizada en una compra' });

            const item = await CarritoModel.agregarPersonalizado(id, producto_id, solicitud_personalizacion_id);
            return res.json({ success: true, message: 'Agregado al carrito', data: item });
        }

        // Opciones de personalización dadas de alta por el admin (Talla, Metal, Grabado…)
        const eleccion = await validarEleccion(Number.parseInt(producto_id), Array.isArray(opciones) ? opciones : undefined);
        if (!eleccion.ok) return res.status(400).json({ success: false, message: eleccion.mensaje });
        if (eleccion.guardado) {
            const item = await CarritoModel.agregarConOpciones(id, producto_id, cantidad, eleccion.guardado, eleccion.clave!, eleccion.costo, nota);
            return res.json({ success: true, message: 'Agregado al carrito', data: item });
        }

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
        const cantidad = Number(req.body.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99)
            return res.status(400).json({ success: false, message: 'Cantidad inválida' });
        // No permitir más piezas de las que hay en existencia
        const st = await pool.query(
            `SELECT p.stock_actual FROM carrito c JOIN productos p ON p.id = c.producto_id WHERE c.id = $1 AND c.usuario_id = $2`,
            [Number.parseInt(id), usuario_id]
        );
        if (st.rows.length && st.rows[0].stock_actual < cantidad)
            return res.status(400).json({ success: false, message: `Solo hay ${st.rows[0].stock_actual} disponible(s)` });

        const item = await CarritoModel.updateCantidad(Number.parseInt(id), usuario_id, cantidad);
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

        await CarritoModel.deleteItem(Number.parseInt(req.params.id), usuario_id);
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

        const { direccion_envio, notas_cliente, metodo_pago_id, tipo_entrega, direccion_data } = req.body;
        if (!direccion_envio)
            return res.status(400).json({ success: false, message: 'Dirección de envío requerida' });

        const items = await CarritoModel.getByUsuario(usuario.id);
        if (!items.length)
            return res.status(400).json({ success: false, message: 'El carrito está vacío' });

        const cliente_id = await VentaModel.getOrCreateCliente(usuario.id, usuario.email, usuario.nombre);
        if (!metodo_pago_id)
            return res.status(400).json({ success: false, message: 'Método de pago requerido' });
        const metodoPago = await VentaModel.getMetodoPagoById(Number.parseInt(metodo_pago_id));
        if (!metodoPago)
            return res.status(400).json({ success: false, message: 'Método de pago inválido' });
        // "efectivo" es exclusivo de recoger en tienda — no tiene sentido con envío a
        // domicilio. Se valida tambien aqui (ademas del filtro en el frontend) por si
        // se llama a este endpoint directamente.
        if (tipo_entrega === 'domicilio' && metodoPago.codigo === 'efectivo') {
            return res.status(400).json({
                success: false,
                message: 'El pago en efectivo solo está disponible al recoger en tienda, no con envío a domicilio.'
            });
        }

        const productIds = items.map(i => i.producto_id);
        const prodsResult = await pool.query(
            `SELECT id, codigo, nombre, imagen_principal FROM productos WHERE id = ANY($1)`,
            [productIds]
        );
        const prodsMap = new Map(prodsResult.rows.map(p => [p.id, p]));

        // ✅ Verificar monto_minimo_compra de promociones activas
        // (misma restriccion por cliente/segmento que en CarritoModel.getByUsuario)
        const totalCarrito = items.reduce((s, i) => s + Number.parseFloat(i.precio_venta) * i.cantidad, 0);
        const promoActiva = await pool.query(`
            SELECT monto_minimo_compra, nombre FROM promociones pr
            WHERE activo = true AND fecha_inicio <= NOW() AND fecha_fin >= NOW()
              AND tipo IN ('porcentaje', 'monto_fijo')
              AND monto_minimo_compra IS NOT NULL
              AND (
                  NOT EXISTS (SELECT 1 FROM cupones_clientes cc WHERE cc.promocion_id = pr.id)
                  OR EXISTS (
                      SELECT 1 FROM cupones_clientes cc
                      WHERE cc.promocion_id = pr.id AND cc.cliente_id = $1
                  )
              )
            ORDER BY valor_descuento DESC LIMIT 1
        `, [cliente_id]);
        if (promoActiva.rows.length > 0) {
            const minimo = Number.parseFloat(promoActiva.rows[0].monto_minimo_compra);
            if (totalCarrito < minimo) {
                // Recalcular sin descuento para los items que no cumplen
                items.forEach(i => { (i as any).precio_promocion = null; });
            }
        }

        const itemsPedido = items.map(item => {
            const precioBase = Number.parseFloat(item.precio_promocion ?? item.precio_oferta ?? item.precio_venta);
            const precio_original = Number.parseFloat(item.precio_venta);
            // El cargo de personalizacion solo aplica si el item viene de una
            // solicitud de personalizacion aprobada (flujo con verificacion del
            // trabajador), no de un simple campo de nota/talla libre.
            const esPersonalizado = !!item.solicitud_personalizacion_id;
            // Las opciones elegidas (grabado, metal…) suman su costo extra, guardado al agregar.
            const cargo_personalizacion = (esPersonalizado ? Number.parseFloat(item.precio_personalizacion || 0) : 0)
                + Number.parseFloat(item.costo_opciones || 0);
            const precio_unitario = precioBase + cargo_personalizacion;
            return {
                producto_id:     item.producto_id,
                producto_codigo: prodsMap.get(item.producto_id)?.codigo || 'SIN-CODIGO',
                producto_nombre: item.producto_nombre,
                producto_imagen: item.producto_imagen,
                cantidad:        item.cantidad,
                precio_unitario,
                precio_original: precio_original !== precioBase ? precio_original : undefined,
                talla_medida:    item.talla_medida || undefined,
                nota:            item.nota || undefined,
                opciones:        item.opciones || null,
                opciones_resumen: resumenDe(item.opciones),
                cargo_personalizacion,
                solicitud_personalizacion_id: item.solicitud_personalizacion_id || undefined,
            };
        });

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

        const cfgEnvio = await pool.query(`SELECT valor FROM configuracion WHERE clave = 'costo_envio_default'`);
        const costoEnvioServidor = cfgEnvio.rows.length ? Number.parseFloat(cfgEnvio.rows[0].valor) || 0 : 50;
        if (tipo_entrega && !['tienda', 'domicilio'].includes(tipo_entrega))
            return res.status(400).json({ success: false, message: 'Tipo de entrega inválido' });

        const venta = await VentaModel.create({
            cliente_id,
            usuario_id:     usuario.id,
            cliente_nombre: usuario.nombre,
            cliente_email:  usuario.email,
            metodo_pago_id,
            direccion_envio,
            notas_cliente,
            tipo_entrega:   tipo_entrega || 'tienda',
            // El costo de envío sale de la configuración, no de lo que mande el navegador
            costo_envio:    tipo_entrega === 'domicilio' ? costoEnvioServidor : 0,
            items: itemsPedido
        });

        // Guardar dirección en tabla direcciones_cliente si es domicilio
        if (tipo_entrega === 'domicilio' && direccion_data) {
        const dirResult = await pool.query(`
            INSERT INTO direcciones_cliente (
                cliente_id, nombre_destinatario, calle, numero_exterior,
                numero_interior, colonia, ciudad, estado, codigo_postal,
                telefono_contacto, referencias, activo, fecha_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, CURRENT_TIMESTAMP)
            RETURNING id
        `, [
            cliente_id,
            usuario.nombre,
            direccion_data.calle,
            direccion_data.numero || null,
            direccion_data.numero_interior || null,
            direccion_data.colonia,
            direccion_data.ciudad,
            direccion_data.estado_dir,
            direccion_data.codigo_postal,
            direccion_data.telefono_contacto || null,
            direccion_data.referencias || null
        ]);

            // ✅ Linkear dirección con la venta
            await pool.query(`
                UPDATE ventas SET direccion_entrega_id = $1 WHERE id = $2
            `, [dirResult.rows[0].id, venta.id]);
        }

        // Correo de "pedido recibido" (los apartados tienen su propio correo)
        if (notas_cliente !== '(Apartado)') {
            VentaModel.getById(venta.id)
                .then(v => v && enviarNotificacionEstadoPedido(v, 'recibido', `Recibimos tu pedido ${v.folio}`))
                .catch(() => { /* no crítico */ });
        }

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
    await expirarSiToca();
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
        const venta = await VentaModel.getById(Number.parseInt(req.params.id));

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
    await expirarSiToca();
    try {
        const { estado } = req.query;
        const ESTADOS_VALIDOS = ['pendiente','confirmado','en_preparacion','enviado','entregado','cancelado'];
        if (estado && !ESTADOS_VALIDOS.includes(String(estado))) {
        return res.status(400).json({ success: false, message: 'Estado inválido' });
        }
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
        const { estado } = req.body;
        // Campo vacío = no tocar la nota anterior (antes la borraba sin querer)
        const notas_internas = typeof req.body.notas_internas === 'string' && req.body.notas_internas.trim()
            ? req.body.notas_internas.trim() : undefined;

        const estadosValidos = ['pendiente','confirmado','en_preparacion','enviado','entregado','cancelado'];
        if (!estadosValidos.includes(estado))
            return res.status(400).json({ success: false, message: 'Estado inválido' });

        const ventaActual = await VentaModel.getById(Number.parseInt(id));
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

        // ✅ Validar que el cliente haya pagado antes de marcar como en preparación, enviado o entregado
        if (['en_preparacion', 'enviado', 'entregado'].includes(estado) && ventaActual.estado_pago !== 'aprobado') {
            return res.status(400).json({
                success: false,
                message: `No puedes marcar como "${labelEstado(estado)}" — el cliente aún no ha realizado el pago.`
            });
        }

        // ✅ "Entregado" solo puede llegar por el flujo de código de entrega (confirmarEntregaCodigo)
        if (estado === 'entregado') {
            return res.status(400).json({
                success: false,
                message: 'No puedes marcar el pedido como "Entregado" desde aquí. Pide el código de entrega al cliente e ingrésalo en el formulario de confirmación.'
            });
        }

        // ✅ "Enviado" solo aplica a pedidos a domicilio, no a los que se recogen en tienda
        if (estado === 'enviado' && (!ventaActual.tipo_entrega || ventaActual.tipo_entrega === 'tienda')) {
            return res.status(400).json({
                success: false,
                message: 'El estado "Enviado" no aplica para pedidos en tienda — solo para entregas a domicilio.'
            });
        }

        if (estado === 'cancelado' && ['entregado', 'cancelado'].includes(ventaActual.estado)) {
            return res.status(400).json({ success: false, message: `El pedido ya está "${labelEstado(ventaActual.estado)}" y no se puede cancelar.` });
        }
        if (estado === ventaActual.estado) {
            return res.status(400).json({ success: false, message: `El pedido ya está en "${labelEstado(estado)}".` });
        }

        const estadoAnterior = ventaActual.estado;

        const venta = await VentaModel.updateEstado(Number.parseInt(id), estado, usuario.id!, notas_internas);

        // ✅ Calcular fecha límite de pago al confirmar
        if (estado === 'confirmado') {
            const configResult = await pool.query(`
                SELECT c1.valor AS tiempo, c2.valor AS unidad
                FROM configuracion c1, configuracion c2
                WHERE c1.clave = 'dias_expiracion_pago'
                AND c2.clave = 'unidad_expiracion_pago'
            `);
            if (configResult.rows.length > 0) {
                const tiempo = parseInt(configResult.rows[0].tiempo);
                const unidad = configResult.rows[0].unidad;
                let minutos = tiempo;
                if (unidad === 'horas') minutos = tiempo * 60;
                if (unidad === 'dias')  minutos = tiempo * 60 * 24;
                const ahoraMx = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
                ahoraMx.setMinutes(ahoraMx.getMinutes() + minutos);
                // Formatear sin conversión UTC
                const fechaLimite = `${ahoraMx.getFullYear()}-${String(ahoraMx.getMonth()+1).padStart(2,'0')}-${String(ahoraMx.getDate()).padStart(2,'0')} ${String(ahoraMx.getHours()).padStart(2,'0')}:${String(ahoraMx.getMinutes()).padStart(2,'0')}:${String(ahoraMx.getSeconds()).padStart(2,'0')}`;

                console.log('AHORA MX:', new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
                console.log('FECHA LIMITE:', fechaLimite);

                await pool.query(`
                    UPDATE ventas 
                    SET fecha_limite_pago = $1
                    WHERE id = $2
                `, [fechaLimite, Number.parseInt(id)]);
            }
        }

        // ✅ Solo restaurar stock si el cliente ya había pagado (stock fue descontado)
        if (estado === 'cancelado' && 
            !['pendiente', 'cancelado'].includes(estadoAnterior) &&
            ventaActual.estado_pago === 'aprobado') {
            try {
                await restaurarStock(Number.parseInt(id));
                console.log(`✅ Stock restaurado para venta ${id}`);
            } catch (stockErr) {
                console.error('⚠️ Error restaurando stock:', stockErr);
            }
        }

        const ventaCompleta = await VentaModel.getById(Number.parseInt(id));
        enviarNotificacionEstadoPedido(ventaCompleta, estado, undefined, notas_internas);

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
        // No se puede pagar un pedido cuyo plazo ya venció
        const plazo = await pool.query(
            `SELECT fecha_limite_pago < (NOW() AT TIME ZONE 'America/Mexico_City') AS vencido FROM ventas WHERE id = $1`, [venta.id]
        );
        if (plazo.rows[0]?.vencido)
            return res.status(400).json({ success: false, message: 'El plazo para pagar este pedido ya venció. Haz un pedido nuevo.' });
        if (venta.estado_pago === 'aprobado')
            return res.status(400).json({ success: false, message: 'Este pedido ya está pagado.' });

        const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!mpToken) return res.status(503).json({ success: false, message: 'MercadoPago no configurado' });

        const items = (venta.items || []).map((item: any) => ({
            id:          String(item.producto_id),
            title:       item.producto_nombre,
            quantity:    item.cantidad,
            unit_price:  Number.parseFloat(item.precio_unitario),
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
            body.auto_return = 'approved';
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
            // ✅ Evitar duplicar transacciones pendientes
            const transaccionExistente = await pool.query(`
                SELECT id FROM transacciones_pago 
                WHERE venta_id = $1 AND estado = 'pendiente'
                LIMIT 1
            `, [venta.id]);

            if (transaccionExistente.rows.length === 0) {
                await VentaModel.crearTransaccion(venta.id, metodo_pago_id, Number.parseFloat(venta.total), mpData.id);
            }
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
        // No se puede pagar un pedido cuyo plazo ya venció
        const plazo = await pool.query(
            `SELECT fecha_limite_pago < (NOW() AT TIME ZONE 'America/Mexico_City') AS vencido FROM ventas WHERE id = $1`, [venta.id]
        );
        if (plazo.rows[0]?.vencido)
            return res.status(400).json({ success: false, message: 'El plazo para pagar este pedido ya venció. Haz un pedido nuevo.' });
        if (venta.estado_pago === 'aprobado')
            return res.status(400).json({ success: false, message: 'Este pedido ya está pagado.' });

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
                        value: Number.parseFloat(String(venta.total)).toFixed(2)
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
        const usuario = getUsuario(req);
        const { order_id } = req.body;
        const venta_id = Number.parseInt(String(req.body.venta_id));
        if (!usuario.id || !venta_id) return res.status(400).json({ success: false, message: 'Datos incompletos' });

        // Solo el dueño del pedido, y solo si aún no está pagado
        const venta = await VentaModel.getById(venta_id);
        if (!venta || venta.creado_por !== usuario.id)
            return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        if (venta.estado_pago === 'aprobado')
            return res.json({ success: true, message: 'Este pedido ya estaba pagado' });

        const v = await verificarYCapturarPayPal(order_id, String(venta.id), Number.parseFloat(String(venta.total)));
        if (!v.ok) return res.status(400).json({ success: false, message: v.mensaje });

        // Si esta orden ya se había procesado (doble clic, recarga), no se vuelve a descontar stock
        const yaProcesada = await pool.query(`SELECT 1 FROM transacciones_pago WHERE transaction_id = $1`, [order_id]);
        await VentaModel.confirmarPagoPayPal(order_id, venta_id);

        if (!yaProcesada.rows.length) {
            try {
                await descontarStock(venta_id);
                const codigoEntrega = await generarCodigoEntrega();
                await pool.query(`UPDATE ventas SET codigo_entrega = $1 WHERE id = $2 AND codigo_entrega IS NULL`, [codigoEntrega, venta_id]);
                const fechaEntrega = await calcularFechaEntrega();
                await pool.query(`UPDATE ventas SET fecha_estimada_entrega = $1 WHERE id = $2 AND fecha_estimada_entrega IS NULL`, [fechaEntrega, venta_id]);
                console.log(`📦 Stock descontado por pago PayPal: venta_id=${venta_id}`);
            } catch (stockErr) {
                console.error('⚠️ Error descontando stock PayPal:', stockErr);
            }
        }
        console.log(`✅ Pago PayPal capturado: orden ${order_id}`);
        res.json({ success: true, message: 'Pago capturado correctamente' });
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

        const XSS_PATTERN = /<\s*script|javascript:|on\w+\s*=|<\s*iframe|<\s*object|<\s*embed/i;
        if (notas_internas && XSS_PATTERN.test(notas_internas)) {
        return res.status(400).json({ success: false, message: 'Datos inválidos en la solicitud' });
        }

        const venta = await VentaModel.getById(Number.parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        if (venta.trabajador_id !== usuario.id && usuario.rol !== 'admin') {
            const rolReal = await getRolFromDB(usuario.id);
            if (rolReal !== 'admin')
                return res.status(403).json({ success: false, message: 'Solo el trabajador asignado puede editar este pedido' });
        }

        const resultado = await VentaModel.editarDetalles(Number.parseInt(id), {
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
        const cantidad = Number(req.body.cantidad);

        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99)
            return res.status(400).json({ success: false, message: 'Cantidad inválida' });

        const venta = await VentaModel.getById(Number.parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        if (venta.trabajador_id !== usuario.id && usuario.rol !== 'admin')
            return res.status(403).json({ success: false, message: 'Sin permiso para modificar este pedido' });
        // Los productos de un pedido solo se cambian antes de que el cliente pague:
        // después, el total ya cobrado dejaría de coincidir
        if (venta.estado_pago === 'aprobado' || ['entregado', 'cancelado'].includes(venta.estado))
            return res.status(400).json({ success: false, message: 'Este pedido ya fue pagado o cerrado; sus productos no se pueden modificar.' });
        const st = await pool.query(
            `SELECT p.stock_actual FROM detalle_ventas vi JOIN productos p ON p.id = vi.producto_id WHERE vi.id = $1 AND vi.venta_id = $2`,
            [Number.parseInt(item_id), Number.parseInt(id)]
        ).catch(() => ({ rows: [] as any[] }));
        if (st.rows.length && st.rows[0].stock_actual < cantidad)
            return res.status(400).json({ success: false, message: `Solo hay ${st.rows[0].stock_actual} disponible(s)` });

        const resultado = await VentaModel.editarCantidadItem(Number.parseInt(item_id), Number.parseInt(id), cantidad);
        res.json({ success: true, message: 'Cantidad actualizada', data: resultado });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const eliminarItemVenta = async (req: Request, res: Response) => {
    try {
        const usuario = getUsuario(req);
        const { id, item_id } = req.params;

        const venta = await VentaModel.getById(Number.parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        if (venta.trabajador_id !== usuario.id && usuario.rol !== 'admin')
            return res.status(403).json({ success: false, message: 'Sin permiso para modificar este pedido' });
        // Los productos de un pedido solo se cambian antes de que el cliente pague:
        // después, el total ya cobrado dejaría de coincidir
        if (venta.estado_pago === 'aprobado' || ['entregado', 'cancelado'].includes(venta.estado))
            return res.status(400).json({ success: false, message: 'Este pedido ya fue pagado o cerrado; sus productos no se pueden modificar.' });

        const resultado = await VentaModel.eliminarItem(Number.parseInt(item_id), Number.parseInt(id));
        res.json({ success: true, message: 'Producto eliminado del pedido', data: resultado });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── DATOS DEL CLIENTE ────────────────────────────────────────

export const getClienteVenta = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const cliente = await VentaModel.getClienteByVenta(Number.parseInt(id));
        if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        res.json({ success: true, data: cliente });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── TOMAR PEDIDO (asignación a trabajador) ───────────────────

export const tomarPedido = async (req: Request, res: Response) => {
    await expirarSiToca();
    try {
        const usuario = getUsuario(req);
        if (!usuario.id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const { id } = req.params;

        const venta = await VentaModel.getById(Number.parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        if (!['pendiente', 'en_preparacion'].includes(venta.estado))
            return res.status(400).json({ success: false, message: 'Este pedido ya fue tomado o no está disponible' });

        if (venta.trabajador_id)
            return res.status(400).json({
                success: false,
                message: `Este pedido ya está siendo atendido por ${venta.trabajador_nombre || 'otro trabajador'}`
            });

        const result = await pool.query(`
            UPDATE ventas
            SET trabajador_id = $1,
                actualizado_por = $1,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $2 AND trabajador_id IS NULL AND estado IN ('pendiente', 'en_preparacion')
            RETURNING *
        `, [usuario.id, Number.parseInt(id)]);

        if (!result.rows.length)
            return res.status(409).json({ 
                success: false, 
                message: 'Otro trabajador tomó este pedido justo ahora. Recarga la lista.' 
            });

        VentaModel.getById(Number.parseInt(id))
            .then(v => v && enviarNotificacionEstadoPedido(v, 'tomado',
                `Tu pedido ${v.folio} ya está siendo atendido${v.trabajador_nombre ? ` por ${v.trabajador_nombre}` : ''}`))
            .catch(() => { /* no crítico */ });

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
                const venta_id = Number.parseInt(pago.external_reference);
                // MercadoPago reenvía el mismo aviso varias veces: si ya se procesó, no se repite
                const yaProcesado = await pool.query(`SELECT 1 FROM transacciones_pago WHERE transaction_id = $1`, [String(pago.id)]);
                if (yaProcesado.rows.length) return res.sendStatus(200);
                const vTotal = await pool.query(`SELECT total FROM ventas WHERE id = $1`, [venta_id]);
                if (!vTotal.rows.length || Math.abs(Number(pago.transaction_amount) - Number.parseFloat(vTotal.rows[0].total)) > 0.01) {
                    console.error(`⚠️ Pago MP ${pago.id}: el monto no coincide con la venta ${venta_id}`);
                    return res.sendStatus(200);
                }
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

        const venta = await VentaModel.getById(Number.parseInt(id));
        if (!venta) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

        const esOwner = venta.creado_por === usuarioId;
        const esStaff = ['admin','trabajador'].includes(usuarioRol);
        if (!esOwner && !esStaff)
            return res.status(403).json({ success: false, message: 'Acceso denegado' });

        // ✅ El recibo solo se genera hasta que la compra esté finalizada (pedido entregado)
        if (venta.estado !== 'entregado') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(400).send(`
                <div style="font-family:Arial,sans-serif; text-align:center; padding:60px 20px; color:#333;">
                    <h2>📄 Recibo no disponible todavía</h2>
                    <p>El recibo de este pedido se genera hasta que sea marcado como <strong>entregado</strong>.</p>
                    <p>Estado actual: <strong>${labelEstado(venta.estado)}</strong></p>
                </div>
            `);
        }

        const fechaStr = venta.fecha_creacion;
        const fechaUTC = /Z|[+-]\d{2}:?\d{2}$/.test(fechaStr) ? fechaStr : fechaStr.replace(' ', 'T') + 'Z';
        const fechaFormato = new Intl.DateTimeFormat('es-MX', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Mexico_City'
        }).format(new Date(fechaUTC));
        const fechaHoy = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric', timeZone:'America/Mexico_City' });

        const esc = (v: any) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
        const dinero = (v: any) => `$${Number.parseFloat(v || '0').toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const piezas = (venta.items || []).reduce((n: number, i: any) => n + Number(i.cantidad || 0), 0);
        const esDomicilio = venta.tipo_entrega === 'domicilio' && venta.dir_calle;
        const filasHTML = (venta.items || []).map((item: any) => {
            const img = item.producto_imagen || item.imagen_principal || item.imagen_url;
            return `
            <div class="item">
                ${img ? `<img src="${esc(img)}" alt="">` : '<div class="item-ph">◆</div>'}
                <div class="item-info">
                    <p class="item-nombre">${esc(item.producto_nombre)}</p>
                    ${item.talla_medida ? `<p class="item-det">Talla/medida: ${esc(item.talla_medida)}</p>` : ''}
                    ${item.opciones_resumen ? `<p class="item-det">${esc(item.opciones_resumen)}</p>` : ''}
                    ${item.nota ? `<p class="item-det">Nota: ${esc(item.nota)}</p>` : ''}
                    <p class="item-cant">${item.cantidad} × ${dinero(item.precio_unitario)}</p>
                </div>
                <p class="item-total">${dinero(item.subtotal)}</p>
            </div>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Recibo ${esc(venta.folio)} · Joyería Diana Laura</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,600&family=Poppins:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Poppins',Arial,sans-serif;color:#2b1d24;background:radial-gradient(circle at 15% 0%,#fbe3ec 0,transparent 45%),radial-gradient(circle at 90% 100%,#f3e6ff 0,transparent 40%),#fdf7f9;min-height:100vh;padding:36px 16px 60px}
.barra{max-width:680px;margin:0 auto 16px;display:flex;justify-content:flex-end;gap:10px}
.barra button{font:600 14px 'Poppins',sans-serif;border:0;border-radius:14px;padding:12px 20px;cursor:pointer;background:linear-gradient(135deg,#d4899f,#b85c7c);color:#fff;box-shadow:0 8px 22px rgba(184,92,124,.3)}
.barra button.sec{background:#fff;color:#b85c7c;border:1.5px solid #ecb2c3;box-shadow:none}
.recibo{max-width:680px;margin:0 auto;background:#fff;border-radius:32px;overflow:hidden;box-shadow:0 20px 60px rgba(120,50,80,.14);position:relative}
.cabeza{position:relative;padding:36px 40px 70px;color:#fff;background:linear-gradient(135deg,#2a1520 0%,#5a2340 55%,#b85c7c 100%);overflow:hidden}
.cabeza::before,.cabeza::after{content:'';position:absolute;border-radius:50%;background:rgba(255,255,255,.08)}
.cabeza::before{width:260px;height:260px;right:-80px;top:-110px}
.cabeza::after{width:160px;height:160px;right:120px;bottom:-100px}
.marca{display:flex;align-items:center;gap:12px;position:relative}
.logo{width:48px;height:48px;border-radius:16px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;font:italic 600 22px 'Playfair Display',serif}
.marca strong{display:block;font:italic 600 22px 'Playfair Display',serif}
.marca small{font-size:12px;opacity:.75;letter-spacing:.5px}
.cabeza-fila{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:30px;position:relative}
.eti{font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.7}
.folio{font-size:30px;font-weight:700;letter-spacing:-.5px;margin-top:2px}
.sello{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:#fff;color:#1f8a5b;font-size:13px;font-weight:700}
.sello i{width:20px;height:20px;border-radius:50%;background:#1f8a5b;color:#fff;font-style:normal;display:flex;align-items:center;justify-content:center;font-size:12px}
.total-card{position:relative;margin:-44px 28px 0;background:#fff;border-radius:24px;padding:20px 24px;box-shadow:0 12px 34px rgba(120,50,80,.14);display:flex;justify-content:space-between;align-items:center;gap:16px}
.total-card .eti{opacity:1;color:#9a7f8b}
.total-card .monto{font-size:34px;font-weight:700;letter-spacing:-1px;color:#b85c7c;line-height:1.1}
.total-card .monto small{font-size:14px;font-weight:500;color:#9a7f8b;margin-left:4px}
.total-card .lado{text-align:right;font-size:13px;color:#6b5560;line-height:1.6}
.cuerpo{padding:28px 28px 8px}
.datos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:26px}
.dato{background:#fbf5f7;border-radius:18px;padding:14px 16px}
.dato .eti{opacity:1;color:#b85c7c;font-weight:600;font-size:10px}
.dato p{font-size:13.5px;font-weight:600;margin-top:4px;line-height:1.4}
.dato span{display:block;font-size:12px;color:#8a7380;font-weight:400;word-break:break-word}
.titulo{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
.titulo h2{font:italic 600 20px 'Playfair Display',serif}
.titulo span{font-size:12.5px;color:#8a7380}
.item{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px dashed #efdde4}
.item:last-child{border-bottom:0}
.item img,.item-ph{width:56px;height:56px;border-radius:16px;object-fit:cover;flex-shrink:0;background:#fbe3ec;color:#b85c7c;display:flex;align-items:center;justify-content:center}
.item-info{flex:1;min-width:0}
.item-nombre{font-weight:600;font-size:14.5px}
.item-det{font-size:12px;color:#8a7380;margin-top:1px}
.item-cant{font-size:12.5px;color:#6b5560;margin-top:3px}
.item-total{font-weight:700;font-size:15px;white-space:nowrap}
.corte{position:relative;height:28px;margin:14px 0}
.corte::before{content:'';position:absolute;left:28px;right:28px;top:50%;border-top:2px dashed #efdde4}
.corte::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 0 50%,#fdf7f9 14px,transparent 15px),radial-gradient(circle at 100% 50%,#fdf7f9 14px,transparent 15px)}
.totales{padding:0 28px 26px}
.fila{display:flex;justify-content:space-between;font-size:14px;color:#6b5560;padding:5px 0}
.fila.final{margin-top:8px;padding-top:12px;border-top:1px solid #efdde4;font-size:18px;font-weight:700;color:#2b1d24}
.fila.final span:last-child{color:#b85c7c}
.nota{margin:0 28px 26px;padding:14px 16px;border-radius:18px;background:#fff7e8;color:#7a5a1e;font-size:13px;line-height:1.5}
.pie{text-align:center;padding:26px 28px 30px;background:#fbf5f7}
.pie h3{font:italic 600 22px 'Playfair Display',serif;color:#b85c7c}
.pie p{font-size:12.5px;color:#8a7380;margin-top:6px;line-height:1.6}
.pie .gen{font-size:11px;color:#b9a6ae;margin-top:14px;letter-spacing:.5px}
@media (max-width:560px){.cabeza{padding:28px 22px 64px}.cabeza-fila{flex-direction:column;align-items:flex-start}.total-card{margin:-40px 14px 0;flex-direction:column;align-items:flex-start}.total-card .lado{text-align:left}.cuerpo{padding:22px 16px 4px}.datos{grid-template-columns:1fr}.totales{padding:0 16px 22px}.nota{margin:0 16px 22px}}
@media print{body{background:#fff;padding:0}.barra{display:none}.recibo{box-shadow:none;border-radius:0;max-width:none}.corte::after{display:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="barra">
    <button class="sec" onclick="window.close()">Cerrar</button>
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
</div>
<div class="recibo">
    <div class="cabeza">
        <div class="marca"><div class="logo">DL</div><div><strong>Joyería Diana Laura</strong><small>Huejutla de Reyes, Hidalgo</small></div></div>
        <div class="cabeza-fila">
            <div><p class="eti">Recibo de compra</p><p class="folio">${esc(venta.folio)}</p></div>
            <span class="sello"><i>✓</i> Pagado y entregado</span>
        </div>
    </div>

    <div class="total-card">
        <div><p class="eti">Total pagado</p><p class="monto">${dinero(venta.total)}<small>MXN</small></p></div>
        <div class="lado">${fechaFormato}<br>${esc(venta.metodo_pago_nombre || 'Método no especificado')}</div>
    </div>

    <div class="cuerpo">
        <div class="datos">
            <div class="dato"><p class="eti">Cliente</p><p>${esc(venta.cliente_nombre_completo)}<span>${esc(venta.cliente_email)}</span></p></div>
            <div class="dato"><p class="eti">Entrega</p>${esDomicilio
                ? `<p>Envío a domicilio<span>${esc(venta.dir_calle)} ${esc(venta.dir_numero || '')}${venta.dir_numero_interior ? ` Int. ${esc(venta.dir_numero_interior)}` : ''}, ${esc(venta.dir_colonia)}, ${esc(venta.dir_ciudad)}, CP ${esc(venta.dir_codigo_postal)}</span></p>`
                : `<p>Recogido en tienda<span>Joyería Diana Laura</span></p>`}</div>
            <div class="dato"><p class="eti">Atendido por</p><p>${esc(venta.trabajador_nombre || 'Equipo Diana Laura')}<span>${piezas} pieza${piezas === 1 ? '' : 's'}</span></p></div>
        </div>

        <div class="titulo"><h2>Tus piezas</h2><span>${(venta.items || []).length} producto${(venta.items || []).length === 1 ? '' : 's'}</span></div>
        ${filasHTML}
    </div>

    <div class="corte"></div>

    <div class="totales">
        <div class="fila"><span>Subtotal</span><span>${dinero(venta.subtotal)}</span></div>
        <div class="fila"><span>IVA (16%)</span><span>${dinero(venta.iva)}</span></div>
        ${Number.parseFloat(venta.costo_envio || '0') > 0 ? `<div class="fila"><span>Envío a domicilio</span><span>+${dinero(venta.costo_envio)}</span></div>` : ''}
        <div class="fila final"><span>Total</span><span>${dinero(venta.total)} MXN</span></div>
    </div>

    ${venta.notas_cliente ? `<div class="nota"><strong>Tu nota:</strong> ${esc(venta.notas_cliente)}</div>` : ''}

    <div class="pie">
        <h3>¡Gracias por elegirnos!</h3>
        <p>Cuida tus piezas lejos del agua, perfumes y cremas para que conserven su brillo.<br>Cualquier duda, escríbenos desde la sección de contacto de la tienda.</p>
        <p class="gen">Generado el ${fechaHoy} · ${esc(venta.folio)}</p>
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
        const venta = await VentaModel.getById(Number.parseInt(id));
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
        `, [Number.parseInt(id), venta.metodo_pago_id, Number.parseFloat(venta.total), transactionId]);

        // ✅ Avanzar estado a en_preparacion
        await pool.query(`
            UPDATE ventas 
            SET estado = 'en_preparacion', fecha_actualizacion = CURRENT_TIMESTAMP 
            WHERE id = $1
        `, [Number.parseInt(id)]);

        // ✅ Generar código de entrega
        const codigoEntrega = await generarCodigoEntrega();
        await pool.query(`
            UPDATE ventas SET codigo_entrega = $1 WHERE id = $2 AND codigo_entrega IS NULL
        `, [codigoEntrega, Number.parseInt(id)]);

        // ✅ Calcular y guardar fecha estimada de entrega
        const fechaEntrega = fecha_estimada || await calcularFechaEntrega();
        //console.log(`📅 Fecha entrega calculada: ${fechaEntrega}`);
        await pool.query(`
            UPDATE ventas SET fecha_estimada_entrega = $1 WHERE id = $2 AND fecha_estimada_entrega IS NULL
        `, [fechaEntrega, Number.parseInt(id)]);
        
        // ✅ Descontar stock al confirmar pago manual
        try {
            await descontarStock(Number.parseInt(id));
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

        const venta = await VentaModel.getById(Number.parseInt(id));
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
        `, [uploadResult.secure_url, Number.parseInt(id)]);

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
    await expirarSiToca();
    try {
        const usuario = getUsuario(req);
        if (!usuario.id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const result = await pool.query(`
            SELECT 
                v.id,
                v.folio,
                v.estado,
                v.fecha_actualizacion,
                v.notas_internas,
                u.nombre AS trabajador_nombre,
                COALESCE(
                    (SELECT tp.estado FROM transacciones_pago tp
                     WHERE tp.venta_id = v.id
                     ORDER BY tp.fecha_creacion DESC LIMIT 1),
                    'pendiente'
                ) AS estado_pago
            FROM ventas v
            LEFT JOIN usuarios u ON u.id = v.trabajador_id
            WHERE v.creado_por = $1
            -- Los terminados se siguen enviando 30 días para poder avisar del cambio final
            AND (v.estado NOT IN ('cancelado', 'entregado', 'expirado')
                 OR COALESCE(v.fecha_actualizacion, v.fecha_creacion) > NOW() - INTERVAL '30 days')
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