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
    generarReciboPDF
} from '../controllers/carrito/carritoController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// ── Webhook MercadoPago (público) ─────────────────────────────
router.post('/webhook/mercadopago', webhookMercadoPago);

// ── Recibo PDF — público con token en query string ───────────
router.get('/pedidos/:id/recibo', generarReciboPDF);

// ── Todo lo demás requiere autenticación ─────────────────────
router.use(authenticateToken);

// ── Carrito ──────────────────────────────────────────────────
router.get('/count',       contarCarrito);
router.get('/',            getCarrito);
router.post('/',           agregarAlCarrito);
router.put('/:id',         actualizarCantidad);
router.delete('/vaciar',   vaciarCarrito);
router.delete('/:id',      eliminarDelCarrito);

// ── Pedidos del cliente ──────────────────────────────────────
router.post('/pedidos',          crearPedido);
router.get('/pedidos/mis',       getMisPedidos);
router.get('/pedidos/:id',       getPedidoById);


// ── Pagos ────────────────────────────────────────────────────
router.post('/pago/mercadopago',      crearPreferenciaMercadoPago);
router.post('/pago/paypal/crear',     crearOrdenPayPal);
router.post('/pago/paypal/capturar',  capturarPagoPayPal);

// ── Para trabajador/admin ────────────────────────────────────
router.get('/pedidos',                     getAllPedidos);
router.patch('/pedidos/:id/tomar',         tomarPedido);
router.patch('/pedidos/:id/detalles',      editarDetallesVenta);
router.patch('/pedidos/:id/items/:item_id/cantidad', editarCantidadItem);
router.delete('/pedidos/:id/items/:item_id', eliminarItemVenta);
router.get('/pedidos/:id/cliente',         getClienteVenta);
router.patch('/pedidos/:id/estado',        actualizarEstadoPedido);

export default router;