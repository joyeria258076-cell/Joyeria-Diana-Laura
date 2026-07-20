import express from 'express';
import { createWorkerAccount, getRoles, toggleWorkerAccountStatus, updateWorker } from '../controllers/admin/adminController';
import { enviarPromocionSegmento } from '../controllers/admin/promocionesSegmentoController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Todas estas rutas empezarán con /api/admin (o lo que definas en server.ts)
 */
router.post('/workers', createWorkerAccount);
router.get('/roles', getRoles);
router.patch('/workers/:id/status', toggleWorkerAccountStatus);
router.put('/workers/:id', updateWorker);
router.post('/promociones/enviar-segmento', enviarPromocionSegmento);

export default router;
