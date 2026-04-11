// Backend/src/routes/bulkUpdateRoutes.ts
import { Router } from 'express';
import { bulkUpdateController } from '../controllers/admin/bulkUpdateController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';

const router = Router();

// Debug
console.log('📦 Registrando rutas de actualización masiva...');

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticateToken);
router.use(requireAdmin);

// Rutas
router.post('/preview', bulkUpdateController.uploadMiddleware, bulkUpdateController.previewUpdate);
router.post('/execute', bulkUpdateController.executeUpdate);
router.get('/template/:tableName', bulkUpdateController.downloadTemplate);

console.log('✅ Rutas de actualización masiva registradas:');
console.log('   POST /preview (subir archivo para previsualizar)');
console.log('   POST /execute (ejecutar actualizaciones)');
console.log('   GET /template/:tableName (descargar plantilla)');

export default router;