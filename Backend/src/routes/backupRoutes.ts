// Ruta: Backend/src/routes/backupRoutes.ts
import { Router } from 'express';
import { generateDirectBackup, getBackupsHistory } from '../controllers/backup/backupController';    
const router = Router();

// Esta ruta será: http://localhost:5000/api/backups/direct-download
router.get('/direct-download', generateDirectBackup);
router.get('/history', getBackupsHistory);

export default router;