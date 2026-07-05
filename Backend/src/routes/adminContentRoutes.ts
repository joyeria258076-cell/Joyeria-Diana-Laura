import { Router } from 'express';
import { adminContentController } from '../controllers/admin/adminContentController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Aplicar autenticación solo a rutas de escritura
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  return authenticateToken(req, res, next);
});

// ==========================================
// CONFIGURACIÓN DE PÁGINA GLOBAL (Banner/Hero)
// ==========================================
router.get('/pages/:pageName', adminContentController.getPageConfig);
router.put('/pages/:pageName', adminContentController.updatePageConfig);

// ==========================================
// GESTIÓN DE NOTICIAS (Artículos)
// ==========================================
router.get('/noticias', adminContentController.getNoticias);
router.post('/noticias', adminContentController.createNoticia);
router.patch('/noticias/:id/status', adminContentController.toggleNoticiaStatus);
router.delete('/noticias/:id', adminContentController.deleteNoticia);

// ==========================================
// GESTIÓN DE CARRUSEL
// ==========================================
router.get('/carrusel', adminContentController.getCarrusel);
router.post('/carrusel', adminContentController.createCarruselItem);
router.delete('/carrusel/:id', adminContentController.deleteCarruselItem);

// ==========================================
// GESTIÓN DE PROMOCIONES 
// ==========================================
router.get('/promociones', adminContentController.getPromociones);
router.get('/promociones/activas', adminContentController.getPromocionesActivas);
router.post('/promociones', adminContentController.createPromocion);
router.put('/promociones/:id', adminContentController.updatePromocion);
router.patch('/promociones/:id/status', adminContentController.togglePromocionStatus);
router.delete('/promociones/:id', adminContentController.deletePromocion);

// ==========================================
// GESTIÓN DE PÁGINAS (CMS DINÁMICO)
// ==========================================
router.get('/paginas', adminContentController.getPaginas);
router.get('/paginas/:id', adminContentController.getPaginaById);
router.post('/paginas', adminContentController.createPagina);
router.put('/paginas/:id', adminContentController.updatePagina);
router.delete('/paginas/:id', adminContentController.deletePagina);

// ==========================================
// GESTIÓN DE SECCIONES (CMS DINÁMICO)
// ==========================================
router.get('/secciones/pagina/:paginaId', adminContentController.getSeccionesByPagina);
router.get('/secciones/:id', adminContentController.getSeccionById);
router.post('/secciones', adminContentController.createSeccion);
router.put('/secciones/:id', adminContentController.updateSeccion);
router.delete('/secciones/:id', adminContentController.deleteSeccion);

// ==========================================
// GESTIÓN DE CONTENIDOS (CMS DINÁMICO)
// ==========================================
router.get('/contenidos/seccion/:seccionId', adminContentController.getContenidosBySeccion);
router.get('/contenidos/:id', adminContentController.getContenidoById);
router.post('/contenidos', adminContentController.createContenido);
router.put('/contenidos/:id', adminContentController.updateContenido);
router.delete('/contenidos/:id', adminContentController.deleteContenido);

// ==========================================
// GESTIÓN DE COLECCIONES
// ==========================================
router.get('/colecciones/publicas', adminContentController.getColeccionesPublicas);
router.get('/colecciones', adminContentController.getColecciones);
router.get('/colecciones/:id', adminContentController.getColeccionById);
router.post('/colecciones', adminContentController.createColeccion);
router.put('/colecciones/:id', adminContentController.updateColeccion);
router.patch('/colecciones/:id/status', adminContentController.toggleColeccionStatus);
router.delete('/colecciones/:id', adminContentController.deleteColeccion);

export default router;