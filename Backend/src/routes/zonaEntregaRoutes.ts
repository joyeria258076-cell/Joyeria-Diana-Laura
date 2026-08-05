import { Router } from 'express';
import { zonaEntregaController } from '../controllers/zonaEntregaController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', zonaEntregaController.getZonasEntrega);
router.post('/', authenticateToken, requireAdmin, zonaEntregaController.crearZonaEntrega);
router.delete('/:id', authenticateToken, requireAdmin, zonaEntregaController.eliminarZonaEntrega);

export default router;
