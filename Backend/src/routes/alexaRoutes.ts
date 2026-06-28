// Ruta: Backend/src/routes/alexaRoutes.ts
import { Router } from 'express';
import {
  getInventario,
  getResumenInventario,
  getMasVendido,
  getNavegacion,
  getApartadoTrabajador,
  postRegistrarAbono,
  getCategorias   
} from '../controllers/alexa/alexaController';
import {
  getMiCarrito,
  agregarAlCarrito,
  quitarDelCarrito,
  getMisApartados,
  getMisPedidos
} from '../controllers/alexa/alexaClienteController';
import { getMiRol } from '../controllers/oauth/oauthController';
import { validarAlexaToken, exigirTrabajador } from '../middleware/alexaAuthMiddleware';

const router = Router();

// ── Rutas públicas (catálogo, precios, navegación) ────────────────────────────
// Cualquier cliente puede consultar esto sin login
router.get('/inventario',            getInventario);
router.get('/inventario/resumen',    getResumenInventario);
router.get('/productos/mas-vendido', getMasVendido);
router.get('/productos/navegacion',  getNavegacion);
router.get('/categorias', getCategorias);

// ── Ruta de sesión: cualquier rol autenticado puede consultar el suyo ────────
router.get('/mi-rol', getMiRol);

// ── Rutas de TRABAJADOR/ADMIN (apartados, abonos de clientes) ────────────────
// 🔒 Requieren token válido Y rol trabajador/admin — nunca accesibles a cliente
router.get('/apartados/:cliente',        validarAlexaToken, exigirTrabajador, getApartadoTrabajador);
router.post('/apartados/:folio/abono',   validarAlexaToken, exigirTrabajador, postRegistrarAbono);

// ── Rutas de CLIENTE (su propio carrito) ──────────────────────────────────────
// 🔒 Requieren solo token válido — cualquier rol (cliente, trabajador, admin)
// puede consultar/modificar SU PROPIO carrito, identificado por su usuario_id
router.get('/mi-carrito',                validarAlexaToken, getMiCarrito);
router.post('/mi-carrito/agregar',       validarAlexaToken, agregarAlCarrito);
router.post('/mi-carrito/quitar',        validarAlexaToken, quitarDelCarrito);
router.get('/mis-apartados',             validarAlexaToken, getMisApartados);
router.get('/mis-pedidos',               validarAlexaToken, getMisPedidos);

export default router;