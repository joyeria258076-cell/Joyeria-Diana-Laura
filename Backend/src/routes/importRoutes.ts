// Backend/src/routes/importRoutes.ts
import { Router } from 'express';
import { importController } from '../controllers/admin/importController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Debug - para verificar que las rutas se están registrando
console.log('📦 Registrando rutas de importación...');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas
router.get('/tables', importController.getTables);
router.get('/tables/:tableName', importController.getTableInfo);
router.post('/preview', importController.uploadMiddleware, importController.previewFile); // Cambiado a previewFile
router.post('/import', importController.importData);
router.post('/validate', importController.validateImport);

console.log('✅ Rutas de importación registradas:');
console.log('   GET /tables');
console.log('   GET /tables/:tableName');
console.log('   POST /preview (soporta Excel y CSV)');
console.log('   POST /import');
console.log('   POST /validate');

export default router;