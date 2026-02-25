import express from 'express';
// Importamos solo lo que es de administración
import { createWorkerAccount } from '../controllers/admin/adminController';

const router = express.Router();

/**
 * Todas estas rutas empezarán con /api/admin (o lo que definas en server.ts)
 */
router.post('/workers', createWorkerAccount); 

export default router;