import express from 'express';
// Importamos solo lo que es de administración
import { createWorkerAccount, getRoles, toggleWorkerAccountStatus, updateWorker } from '../controllers/admin/adminController';

const router = express.Router();

/**
 * Todas estas rutas empezarán con /api/admin (o lo que definas en server.ts)
 */
router.post('/workers', createWorkerAccount); 
router.get('/roles', getRoles); // Nueva ruta para obtener roles disponibles
router.patch('/workers/:id/status', toggleWorkerAccountStatus); // Nueva ruta para activar/desactivar trabajadores
router.put('/workers/:id', updateWorker); // Nueva ruta para actualizar nombre y rol del trabajador

export default router;