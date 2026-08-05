// Ruta: Backend/src/routes/personalizacionRoutes.ts
import { Router } from 'express';
import { authenticateToken, requireStaff } from '../middleware/authMiddleware';
import {
  crearSolicitud, getMisSolicitudes, getSolicitudes, aprobarSolicitud, rechazarSolicitud,
} from '../controllers/personalizacion/personalizacionController';

const router = Router();

router.use(authenticateToken);

// Cliente
router.post('/solicitudes', crearSolicitud);
router.get('/mis-solicitudes', getMisSolicitudes);

// Trabajador/Admin (revision y respuesta)
router.get('/solicitudes', requireStaff, getSolicitudes);
router.patch('/solicitudes/:id/aprobar', requireStaff, aprobarSolicitud);
router.patch('/solicitudes/:id/rechazar', requireStaff, rechazarSolicitud);

export default router;
