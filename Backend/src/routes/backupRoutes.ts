// Ruta: Backend/src/routes/backupRoutes.ts
import { Router } from 'express';
import { generateDirectBackup } from '../controllers/backup/backupController';    
const router = Router();

// Esta ruta será: http://localhost:5000/api/backups/direct-download
router.get('/direct-download', generateDirectBackup);

export default router;