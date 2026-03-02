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

export default router;