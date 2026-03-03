import { Router } from 'express';
import { adminContentController } from '../controllers/admin/adminContentController';

const router = Router();

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
router.post('/promociones', adminContentController.createPromocion);
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

export default router;