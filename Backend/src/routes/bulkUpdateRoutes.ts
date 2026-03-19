import { Router } from 'express';
import { bulkUpdateController } from '../controllers/admin/bulkUpdateController';
import { authenticateToken } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.post('/preview', bulkUpdateController.uploadMiddleware, bulkUpdateController.previewUpdate);
router.post('/execute', bulkUpdateController.executeUpdate);

export default router;