// Ruta: Backend/src/routes/backupRoutes.ts
import { Router } from 'express';
import { generateDirectBackup, getBackupsHistory, getBackupLogContent, downloadBackupLog,
    getSchedulerStatus,updateSchedulerConfig, runSchedulerNow,
    getDatabaseHealth, performMaintenance, deleteBackup,
    getTablesList, downloadCollectionBackup, downloadCollectionCSV } from '../controllers/backup/backupController';    
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

// ─── Mantenimiento y salud de la base de datos
// GET  /api/backups/health       → estado de salud de la base de datos
router.get('/health', getDatabaseHealth);
// POST /api/backups/maintenance  → ejecutar tareas de mantenimiento
router.post('/maintenance', performMaintenance);

// ─── Eliminar respaldo manualmente
// DELETE /api/backups/:backupId → eliminar respaldo por ID
router.delete('/:backupId', deleteBackup);

// ─── Respaldo de colección (tabla específica)
// GET  /api/backups/tables              → lista de tablas disponibles
router.get('/tables', getTablesList);
// GET  /api/backups/collection/:tabla   → descarga .dump de una tabla
router.get('/collection/:tabla', downloadCollectionBackup);
// GET  /api/backups/collection/:tabla/csv  → descarga .csv de una tabla
router.get('/collection/:tabla/csv', downloadCollectionCSV);

export default router;