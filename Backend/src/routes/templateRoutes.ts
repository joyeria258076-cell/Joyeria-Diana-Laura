// Backend/src/routes/templateRoutes.ts
import { Router } from 'express';
import { templateController } from '../controllers/admin/templateController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);
router.use(requireAdmin);

// Descargar plantilla para una tabla específica
router.get('/download/:tableName', templateController.downloadTemplate);

// Obtener información de la plantilla (incluyendo relaciones)
router.get('/info/:tableName', templateController.getTemplateInfo);

export default router;