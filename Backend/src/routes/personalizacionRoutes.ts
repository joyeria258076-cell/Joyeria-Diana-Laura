// Ruta: Backend/src/routes/personalizacionRoutes.ts
import { Router } from 'express';
import { authenticateToken, requireStaff, requireTrabajador } from '../middleware/authMiddleware';
import {
  crearSolicitud, getMisSolicitudes, getSolicitudes, aprobarSolicitud, rechazarSolicitud,
} from '../controllers/personalizacion/personalizacionController';

const router = Router();

router.use(authenticateToken);

// Cliente
router.post('/solicitudes', crearSolicitud);
router.get('/mis-solicitudes', getMisSolicitudes);

// Consulta/monitoreo: trabajador y admin pueden ver la lista.
router.get('/solicitudes', requireStaff, getSolicitudes);

// Habilitar/rechazar es EXCLUSIVO del trabajador (el admin solo monitorea).
router.patch('/solicitudes/:id/aprobar', requireTrabajador, aprobarSolicitud);
router.patch('/solicitudes/:id/rechazar', requireTrabajador, rechazarSolicitud);

export default router;
