import { Router } from 'express';
import { opcionesPersonalizacionController as c } from '../controllers/opcionesPersonalizacionController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Público: opciones que el cliente puede elegir en un producto
router.get('/producto/:id', c.deProducto);

// Admin
router.get('/', authenticateToken, requireAdmin, c.listar);
router.post('/', authenticateToken, requireAdmin, c.crear);
router.put('/:id', authenticateToken, requireAdmin, c.actualizar);
router.delete('/:id', authenticateToken, requireAdmin, c.eliminar);

export default router;
