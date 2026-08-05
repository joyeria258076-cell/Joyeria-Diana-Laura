import { Router } from 'express';
import { visitaSitioController } from '../controllers/visitaSitioController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.post('/registrar', visitaSitioController.registrarVisita);
router.get('/resumen', authenticateToken, requireAdmin, visitaSitioController.getResumen);

export default router;
