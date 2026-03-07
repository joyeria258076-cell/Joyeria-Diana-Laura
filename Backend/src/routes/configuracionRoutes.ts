// Backend/src/routes/configuracionRoutes.ts
import { Router } from 'express';
import { configuracionController } from '../controllers/admin/configuracionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todas las configuraciones
router.get('/', configuracionController.getAll);

// Obtener configuraciones por categoría
router.get('/categoria/:categoria', configuracionController.getByCategoria);

// Obtener configuración por clave
router.get('/:clave', configuracionController.getByClave);

// Actualizar configuración
router.put('/:clave', configuracionController.update);

// Actualizar múltiples configuraciones
router.post('/batch', configuracionController.updateMultiple);

export default router;