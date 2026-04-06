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
    subirComprobante, getEstadosPedidosCliente
} from '../controllers/carrito/carritoController';
import { authenticateToken } from '../middleware/authMiddleware';
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
router.post('/pedidos',          crearPedido);
router.get('/pedidos/mis',       getMisPedidos);
// ✅ mis-estados ANTES de /:id para evitar conflicto de rutas
router.get('/pedidos/mis-estados', getEstadosPedidosCliente);
router.get('/pedidos',           getAllPedidos);
router.get('/pedidos/:id',       getPedidoById);

// ── Pagos ─────────────────────────────────────────────────────
router.post('/pago/mercadopago',      crearPreferenciaMercadoPago);
router.post('/pago/paypal/crear',     crearOrdenPayPal);
router.post('/pago/paypal/capturar',  capturarPagoPayPal);

// ── Gestión de pedidos (trabajador/admin) ─────────────────────
router.patch('/pedidos/:id/tomar',                      tomarPedido);
router.patch('/pedidos/:id/detalles',                   editarDetallesVenta);
router.patch('/pedidos/:id/items/:item_id/cantidad',    editarCantidadItem);
router.delete('/pedidos/:id/items/:item_id',            eliminarItemVenta);
router.get('/pedidos/:id/cliente',                      getClienteVenta);
router.patch('/pedidos/:id/estado',                     actualizarEstadoPedido);
router.post('/pedidos/:id/confirmar-pago-efectivo',     confirmarPagoEfectivo);
router.post('/pedidos/:id/comprobante', uploadSingleImage, handleUploadError, subirComprobante);

export default router;