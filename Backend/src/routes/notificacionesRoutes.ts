import { Router } from 'express';
import { leerPreferencias, guardarPreferencias, quitar, registrar } from '../controllers/notificaciones/notificacionesController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Teléfonos que reciben las notificaciones push del pedido (HU-15, app móvil).
router.post('/dispositivo', authenticateToken, registrar);
router.delete('/dispositivo', authenticateToken, quitar);

// Oposición (ARCO, app móvil #274): la clienta decide si recibe avisos push y correos promocionales.
router.get('/preferencias', authenticateToken, leerPreferencias);
router.put('/preferencias', authenticateToken, guardarPreferencias);

export default router;
