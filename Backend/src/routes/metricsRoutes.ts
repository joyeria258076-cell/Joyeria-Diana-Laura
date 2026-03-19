// src/routes/metricsRoutes.ts
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import {
  getResumen, getRendimiento, getEndpointsLentos,
  getErrores, resolverError, getActividad,
  getDatabase, runVacuum, runAnalyze,
} from '../controllers/admin/metricsController';

const router = Router();
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/resumen',                getResumen);
router.get('/rendimiento',            getRendimiento);
router.get('/endpoints-lentos',       getEndpointsLentos);
router.get('/errores',                getErrores);
router.patch('/errores/:id/resolver', resolverError);
router.get('/actividad',              getActividad);
router.get('/database',               getDatabase);
router.post('/database/vacuum',       runVacuum);   // ✅ NUEVO
router.post('/database/analyze',      runAnalyze);  // ✅ NUEVO

export default router;