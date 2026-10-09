// Backend/src/routes/proveedoresRoutes.ts
import { Router } from 'express';
import { proveedoresController } from '../controllers/admin/proveedoresController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);
router.use(requireAdmin);

// Obtener todos los proveedores
router.get('/', proveedoresController.getAll);

// Obtener proveedor por ID
router.get('/:id', proveedoresController.getById);

// Crear nuevo proveedor
router.post('/', proveedoresController.create);

// Actualizar proveedor
router.put('/:id', proveedoresController.update);

// Eliminar proveedor
router.delete('/:id', proveedoresController.delete);

// Cambiar estado
router.patch('/:id/status', proveedoresController.toggleStatus);

export default router;