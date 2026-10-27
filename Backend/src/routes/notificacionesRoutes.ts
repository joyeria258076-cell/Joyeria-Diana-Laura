import { Router } from 'express';
import { quitar, registrar } from '../controllers/notificaciones/notificacionesController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Teléfonos que reciben las notificaciones push del pedido (HU-15, app móvil).
router.post('/dispositivo', authenticateToken, registrar);
router.delete('/dispositivo', authenticateToken, quitar);

export default router;
