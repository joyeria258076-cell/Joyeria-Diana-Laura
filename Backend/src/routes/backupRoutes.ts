// Ruta: Backend/src/routes/backupRoutes.ts
import { Router } from 'express';
import { generateDirectBackup, getBackupsHistory, getBackupLogContent, downloadBackupLog,
    getSchedulerStatus,updateSchedulerConfig, runSchedulerNow, } from '../controllers/backup/backupController';    
const router = Router();

// Esta ruta será: http://localhost:5000/api/backups/direct-download
router.get('/direct-download', generateDirectBackup);
// ─── Historial / bitácora
router.get('/history', getBackupsHistory);
// ─── Logs 
router.get('/log/:backupId', getBackupLogContent);
router.get('/log/:backupId/download', downloadBackupLog);

// ─── Scheduler (automatización) 
// GET  /api/backups/scheduler/status  → estado actual del scheduler
router.get('/scheduler/status', getSchedulerStatus);
// POST /api/backups/scheduler/config  → actualizar configuración y reiniciar
router.post('/scheduler/config', updateSchedulerConfig);
// POST /api/backups/scheduler/run-now → ejecutar respaldo automático ahora (prueba)
router.post('/scheduler/run-now', runSchedulerNow);

export default router;