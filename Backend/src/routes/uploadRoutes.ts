// Backend/src/routes/uploadRoutes.ts
import { Router } from 'express';
import { uploadController } from '../controllers/general/uploadController'; // ✅ Ruta actualizada
import { authenticateToken } from '../middleware/authMiddleware';
import { uploadSingleImage, handleUploadError } from '../middleware/uploadMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ==========================================
// RUTAS GENERALES DE UPLOAD
// ==========================================

// Subir imagen general
router.post(
  '/image',
  uploadSingleImage,
  handleUploadError,
  uploadController.uploadImage
);

// Actualizar imagen (eliminar anterior y subir nueva)
router.put(
  '/image',
  uploadSingleImage,
  handleUploadError,
  uploadController.updateImage
);

// Eliminar imagen por publicId
router.delete('/image/:publicId', uploadController.deleteImage);

// Obtener información de imagen
router.get('/image/:publicId/info', uploadController.getImageInfo);

// ==========================================
// RUTAS ESPECÍFICAS POR MÓDULO
// ==========================================

// Productos
router.post(
  '/productos/:productoId/imagen',
  uploadSingleImage,
  handleUploadError,
  uploadController.uploadProductImage
);

router.post(
  '/productos/imagen', // Para producto nuevo (sin ID)
  uploadSingleImage,
  handleUploadError,
  uploadController.uploadProductImage
);

// Categorías
router.post(
  '/categorias/:categoriaId/imagen',
  uploadSingleImage,
  handleUploadError,
  uploadController.uploadCategoryImage
);

router.post(
  '/categorias/imagen', // Para categoría nueva
  uploadSingleImage,
  handleUploadError,
  uploadController.uploadCategoryImage
);

export default router;