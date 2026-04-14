// Backend/src/routes/predictiveRoutes.ts
import express from 'express';
import {
  getAnios,
  getMesesDisponibles,
  getCategorias,
  getProductoEstrella,
  getHistorico,
  getProyeccion,
} from '../controllers/admin/predictiveController';

const router = express.Router();

// GET /api/prediccion/anios
router.get('/anios', getAnios);

// GET /api/prediccion/meses-disponibles?anio=2025
router.get('/meses-disponibles', getMesesDisponibles);

// GET /api/prediccion/categorias?anio=2025&mes_inicio=3
router.get('/categorias', getCategorias);

// GET /api/prediccion/producto-estrella/:categoriaId?anio=2025&mes_inicio=3
router.get('/producto-estrella/:categoriaId', getProductoEstrella);

// GET /api/prediccion/historico/:productoId?anio=2025&mes_inicio=3
router.get('/historico/:productoId', getHistorico);

// POST /api/prediccion/proyeccion
router.post('/proyeccion', getProyeccion);

export default router;