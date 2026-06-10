import { Router } from 'express';
import {
    crearApartado, confirmarPagoInicial,
    getMisApartados, getApartadoById,
    getTodosApartados, registrarAbono,
    cancelarApartado, marcarAdvertencia,
    crearPreferenciaMP_Apartado, webhookMP_Apartado,
    crearOrdenPayPal_Apartado, capturarPayPal_Apartado,
    subirComprobanteApartado, archivarApartado,
    getPlanes, crearPlan, actualizarPlan, eliminarPlan
} from '../controllers/apartado/apartadoController';
import { authenticateToken } from '../middleware/authMiddleware';
import { uploadSingleImage, handleUploadError } from '../middleware/uploadMiddleware';

const router = Router();

// ── Webhook MP (público) ──────────────────────────────────────
router.post('/webhook/mercadopago', webhookMP_Apartado);

router.use(authenticateToken);

// ── Planes de abono ───────────────────────────────────────────
router.get('/planes',          getPlanes);
router.post('/planes',         crearPlan);
router.put('/planes/:id',      actualizarPlan);
router.delete('/planes/:id',   eliminarPlan);

// ── Cliente ───────────────────────────────────────────────────
router.post('/',               crearApartado);
router.get('/mis-apartados',   getMisApartados);

// ── Compartidas ───────────────────────────────────────────────
router.get('/:id',             getApartadoById);

// ── Trabajador / Admin ────────────────────────────────────────
router.get('/',                        getTodosApartados);
router.post('/:id/confirmar-pago',     confirmarPagoInicial);
router.post('/:id/abono',              registrarAbono);
router.patch('/:id/cancelar',          cancelarApartado);
router.patch('/:id/advertencia',       marcarAdvertencia);
router.patch('/:id/archivar',          archivarApartado);

// ── Pagos ─────────────────────────────────────────────────────
router.post('/pago/mercadopago',       crearPreferenciaMP_Apartado);
router.post('/pago/paypal/crear',      crearOrdenPayPal_Apartado);
router.post('/pago/paypal/capturar',   capturarPayPal_Apartado);
router.post('/:id/comprobante',        uploadSingleImage, handleUploadError, subirComprobanteApartado);

export default router;