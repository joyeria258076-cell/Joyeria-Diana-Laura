// Ruta: Backend/src/routes/alexaRoutes.ts
import { Router } from 'express';
import {
  getInventario,
  getResumenInventario,
  getMasVendido,
  getNavegacion,
  getApartadoTrabajador,
  postRegistrarAbono
} from '../controllers/alexa/alexaController';
import { validarAlexaToken } from '../middleware/alexaAuthMiddleware';

const router = Router();

// ── Rutas públicas (catálogo, precios, navegación) ────────────────────────────
// Cualquier cliente puede consultar esto sin login
router.get('/inventario',            getInventario);
router.get('/inventario/resumen',    getResumenInventario);
router.get('/productos/mas-vendido', getMasVendido);
router.get('/productos/navegacion',  getNavegacion);

// ── Rutas protegidas (apartados, abonos) ───────────────────────────────────────
// Requieren access_token de Account Linking (solo trabajador/admin vinculado)
router.get('/apartados/:cliente',        validarAlexaToken, getApartadoTrabajador);
router.post('/apartados/:folio/abono',   validarAlexaToken, postRegistrarAbono);

export default router;