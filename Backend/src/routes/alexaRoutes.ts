import { Router } from 'express';
import {
  getInventario,
  getResumenInventario,
  getMasVendido,
  getNavegacion,
  getApartado
} from '../controllers/alexa/alexaController';

const router = Router();

router.get('/inventario',           getInventario);
router.get('/inventario/resumen',   getResumenInventario);
router.get('/productos/mas-vendido', getMasVendido);
router.get('/productos/navegacion', getNavegacion);
router.get('/apartados/:cliente',   getApartado);

export default router;