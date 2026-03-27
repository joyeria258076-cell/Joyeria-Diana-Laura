// Backend/src/routes/predictiveRoutes.ts
import express from 'express';
import {
  getCategorias,
  getProductoEstrella,
  getHistorico,
  getProyeccion,
} from '../controllers/admin/predictiveController';

const router = express.Router();

// GET /api/prediccion/categorias?anio=2024
router.get('/categorias', getCategorias);

// GET /api/prediccion/producto-estrella/:categoriaId?anio=2024
router.get('/producto-estrella/:categoriaId', getProductoEstrella);

// GET /api/prediccion/historico/:productoId?anio=2024
router.get('/historico/:productoId', getHistorico);

// POST /api/prediccion/proyeccion
router.post('/proyeccion', getProyeccion);

export default router;