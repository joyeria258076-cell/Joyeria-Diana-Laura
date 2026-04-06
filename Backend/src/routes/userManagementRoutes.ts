// Backend/src/routes/userManagementRoutes.ts
import { Router } from 'express';
import { userManagementController } from '../controllers/admin/userManagementController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';

const router = Router();

// Todas las rutas requieren autenticación y rol admin
router.use(authenticateToken);
router.use(requireAdmin);

console.log('📦 Registrando rutas de gestión de usuarios y esquemas...');

// Rutas de gestión de usuarios de BD
router.get('/database-users', userManagementController.getDatabaseUsers);
router.post('/database-user', userManagementController.createDatabaseUser);
router.delete('/database-user/:username', userManagementController.revokeUserAccess);

// Rutas de gestión de esquemas
router.get('/schemas', userManagementController.getSchemas);
router.post('/schema', userManagementController.createSchema);

console.log('✅ Rutas de gestión de usuarios registradas:');
console.log('   GET /database-users');
console.log('   POST /database-user');
console.log('   DELETE /database-user/:username');
console.log('   GET /schemas');
console.log('   POST /schema');

export default router;