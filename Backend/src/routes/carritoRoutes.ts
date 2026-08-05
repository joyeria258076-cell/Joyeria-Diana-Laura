// Ruta: Backend/src/routes/carritoRoutes.ts
import { Router } from 'express';
import {
    getCarrito, agregarAlCarrito, actualizarCantidad,
    eliminarDelCarrito, vaciarCarrito, contarCarrito,
    crearPedido, getMisPedidos, getPedidoById,
    getAllPedidos, actualizarEstadoPedido, tomarPedido,
    editarDetallesVenta, editarCantidadItem, eliminarItemVenta, getClienteVenta,
    crearPreferenciaMercadoPago, webhookMercadoPago,
    crearOrdenPayPal, capturarPagoPayPal,
    generarReciboPDF, confirmarPagoEfectivo,
    subirComprobante, getEstadosPedidosCliente, validarCodigoEntrega,
    confirmarEntregaCodigo
} from '../controllers/carrito/carritoController';
import { authenticateToken, requireTrabajador } from '../middleware/authMiddleware';
import { uploadSingleImage, handleUploadError } from '../middleware/uploadMiddleware';
import { pool } from '../config/database';
import { VentaModel } from '../models/carritoModel';

const router = Router();

// ── Webhook MercadoPago (público) ─────────────────────────────
router.post('/webhook/mercadopago', webhookMercadoPago);
router.get('/webhook/mercadopago', (req, res) => res.sendStatus(200));

// ── Recibo PDF — público con token en query string ────────────
router.get('/pedidos/:id/recibo', generarReciboPDF);

// ── Endpoints públicos ────────────────────────────────────────
router.get('/estados-pedido', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT unnest(enum_range(NULL::estado_pedido_enum))::text AS estado
        `);
        res.json({ success: true, data: result.rows.map((r: any) => r.estado) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/metodos-pago', async (req, res) => {
    try {
        const metodos = await VentaModel.getMetodosPago();
        res.json({ success: true, data: metodos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ── Todo lo demás requiere autenticación ─────────────────────
router.use(authenticateToken);

// ── Carrito ───────────────────────────────────────────────────
router.get('/count',       contarCarrito);
router.get('/',            getCarrito);
router.post('/',           agregarAlCarrito);
router.put('/:id',         actualizarCantidad);
router.delete('/vaciar',   vaciarCarrito);
router.delete('/:id',      eliminarDelCarrito);

// ── Pedidos — rutas específicas ANTES que /:id ────────────────
router.post('/pedidos',                   crearPedido);
router.get('/pedidos/mis',                getMisPedidos);
router.get('/pedidos/mis-estados',        getEstadosPedidosCliente);
// ✅ rutas de código ANTES de /:id para evitar conflictos
router.post('/pedidos/validar-codigo',    requireTrabajador, validarCodigoEntrega);
router.post('/pedidos/confirmar-entrega', requireTrabajador, confirmarEntregaCodigo);
// Consulta/monitoreo: accesible a trabajador y admin (getAllPedidos ya filtra por rol internamente)
router.get('/pedidos',                    getAllPedidos);
router.get('/pedidos/:id',                getPedidoById);

// ── Pagos ─────────────────────────────────────────────────────
router.post('/pago/mercadopago',      crearPreferenciaMercadoPago);
router.post('/pago/paypal/crear',     crearOrdenPayPal);
router.post('/pago/paypal/capturar',  capturarPagoPayPal);

// ── Gestión de pedidos — acciones EXCLUSIVAS del trabajador (el admin solo monitorea) ──
router.patch('/pedidos/:id/tomar',                      requireTrabajador, tomarPedido);
router.patch('/pedidos/:id/detalles',                   requireTrabajador, editarDetallesVenta);
router.patch('/pedidos/:id/items/:item_id/cantidad',    requireTrabajador, editarCantidadItem);
router.delete('/pedidos/:id/items/:item_id',            requireTrabajador, eliminarItemVenta);
router.get('/pedidos/:id/cliente',                      getClienteVenta);
router.patch('/pedidos/:id/estado',                     requireTrabajador, actualizarEstadoPedido);
router.post('/pedidos/:id/confirmar-pago-efectivo',     requireTrabajador, confirmarPagoEfectivo);
// subirComprobante: el CLIENTE sube su propio comprobante, no se restringe a trabajador.
router.post('/pedidos/:id/comprobante', uploadSingleImage, handleUploadError, subirComprobante);

export default router;