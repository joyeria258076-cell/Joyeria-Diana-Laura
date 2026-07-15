import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import {
  crearSolicitud,
  getMisSolicitudes,
  getSolicitudesPendientes,
  aprobarSolicitud,
  rechazarSolicitud,
  eliminarSolicitud,
} from '../controllers/usuario/solicitudesController';

import { solicitarRecuperacionSinSesion } from '../controllers/usuario/solicitudesController';

const router = Router();

// Ruta pública — solo requiere preAuthToken (usuario en flujo de login sin sesión)
router.post('/recuperar-codigo', solicitarRecuperacionSinSesion);

router.use(authenticateToken);

// Trabajador / cliente
router.post('/', crearSolicitud);
router.get('/mias', getMisSolicitudes);

// Solo admin
router.get('/', requireAdmin, getSolicitudesPendientes);
router.patch('/:id/aprobar', requireAdmin, aprobarSolicitud);
router.patch('/:id/rechazar', requireAdmin, rechazarSolicitud);
router.delete('/:id', eliminarSolicitud);

export default router;
