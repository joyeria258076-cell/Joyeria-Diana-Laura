// Backend/src/routes/exportRoutes.ts
import { Router } from 'express';
import { exportController } from '../controllers/admin/exportController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/metadata/:tableName', exportController.getTableMetadata);
router.post('/preview', exportController.previewExport);
router.post('/export', exportController.exportData);

export default router;