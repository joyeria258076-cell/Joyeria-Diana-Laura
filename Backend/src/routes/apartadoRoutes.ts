import { Router } from 'express';
import {
    crearApartado, confirmarPagoInicial,
    getMisApartados, getApartadoById,
    getTodosApartados, registrarAbono,
    cancelarApartado, marcarAdvertencia,
    crearPreferenciaMP_Apartado, webhookMP_Apartado,
    crearOrdenPayPal_Apartado, capturarPayPal_Apartado,
    subirComprobanteApartado, archivarApartado,
    getPlanes, crearPlan, actualizarPlan, eliminarPlan,
    solicitarAbono, confirmarAbonoPendiente,
    crearPreferenciaMP_AbonoSig, crearOrdenPayPal_AbonoSig, capturarPayPal_AbonoSig
} from '../controllers/apartado/apartadoController';
import { authenticateToken, requireTrabajador } from '../middleware/authMiddleware';
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

// ── Monitoreo (trabajador y admin pueden CONSULTAR) ────────────
router.get('/',                        getTodosApartados);

// ── Acciones EXCLUSIVAS del trabajador (el admin solo monitorea) ──
router.post('/:id/confirmar-pago',     requireTrabajador, confirmarPagoInicial);
router.post('/:id/abono',              requireTrabajador, registrarAbono);
router.patch('/:id/cancelar',          requireTrabajador, cancelarApartado);
router.patch('/:id/advertencia',       requireTrabajador, marcarAdvertencia);
router.patch('/:id/archivar',          requireTrabajador, archivarApartado);

// ── Pagos (abono inicial) ─────────────────────────────────────
router.post('/pago/mercadopago',            crearPreferenciaMP_Apartado);
router.post('/pago/paypal/crear',           crearOrdenPayPal_Apartado);
router.post('/pago/paypal/capturar',        capturarPayPal_Apartado);
router.post('/:id/comprobante',             uploadSingleImage, handleUploadError, subirComprobanteApartado);

// ── Abonos siguientes (cliente solicita, trabajador confirma) ─
router.post('/:id/solicitar-abono',         uploadSingleImage, handleUploadError, solicitarAbono);
router.post('/:id/confirmar-abono',         requireTrabajador, confirmarAbonoPendiente);
router.post('/pago/mercadopago/abono',      crearPreferenciaMP_AbonoSig);
router.post('/pago/paypal/abono/crear',     crearOrdenPayPal_AbonoSig);
router.post('/pago/paypal/abono/capturar',  capturarPayPal_AbonoSig);

export default router;