// Ruta: Backend/src/routes/carritoRoutes.ts
import { Router } from 'express';
import {
    getCarrito, agregarAlCarrito, actualizarCantidad,
    eliminarDelCarrito, vaciarCarrito, contarCarrito,
    crearPedido, getMisPedidos, getPedidoById,
    getAllPedidos, actualizarEstadoPedido,
    crearPreferenciaMercadoPago, webhookMercadoPago
} from '../controllers/carrito/carritoController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// ── Webhook MercadoPago (público — MP lo llama sin auth) ─────
router.post('/webhook/mercadopago', webhookMercadoPago);

// ── A partir de aquí todo requiere autenticación ─────────────
router.use(authenticateToken);

// ── Carrito ──────────────────────────────────────────────────
router.get('/count',           contarCarrito);
router.get('/',                getCarrito);
router.post('/',               agregarAlCarrito);
router.put('/:id',             actualizarCantidad);
router.delete('/vaciar',       vaciarCarrito);
router.delete('/:id',          eliminarDelCarrito);

// ── Pedidos del cliente ──────────────────────────────────────
router.post('/pedidos',        crearPedido);
router.get('/pedidos/mis',     getMisPedidos);
router.get('/pedidos/:id',     getPedidoById);

// ── MercadoPago ──────────────────────────────────────────────
router.post('/pago/preferencia', crearPreferenciaMercadoPago);

// ── Pedidos para trabajador/admin ────────────────────────────
router.get('/pedidos',         getAllPedidos);
router.patch('/pedidos/:id/estado', actualizarEstadoPedido);

export default router;