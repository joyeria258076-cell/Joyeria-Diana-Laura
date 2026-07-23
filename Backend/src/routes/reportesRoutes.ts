// src/routes/reportesRoutes.ts
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import {
  getVentasTotales,
  getProductosMasVendidos,
  getInventario,
  getPerformanceTrabajadores,
} from '../controllers/admin/reportesController';

const router = Router();
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/ventas',       getVentasTotales);
router.get('/productos',    getProductosMasVendidos);
router.get('/inventario',   getInventario);
router.get('/trabajadores', getPerformanceTrabajadores);

export default router;
