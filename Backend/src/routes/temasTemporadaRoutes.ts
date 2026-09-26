import { Router } from 'express';
import { temasTemporadaController } from '../controllers/temasTemporadaController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Público: temáticas activas que los usuarios pueden elegir
router.get('/', temasTemporadaController.getActivas);

// Admin
router.get('/todas', authenticateToken, requireAdmin, temasTemporadaController.getTodas);
router.post('/', authenticateToken, requireAdmin, temasTemporadaController.crear);
router.put('/:id', authenticateToken, requireAdmin, temasTemporadaController.actualizar);
router.patch('/:id/activo', authenticateToken, requireAdmin, temasTemporadaController.cambiarActivo);
router.delete('/:id', authenticateToken, requireAdmin, temasTemporadaController.eliminar);

export default router;
