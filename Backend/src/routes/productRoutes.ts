import { Router } from 'express';
import { 
    getProducts, 
    createProduct, 
    deleteProduct,
    getCategories,
    getCategoryById,
    getSubcategorias,
    createCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory
} from '../controllers/producto/productoController';

import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// ==========================================
// 🔓 RUTAS PÚBLICAS (Cualquiera puede verlas)
// ==========================================
router.get('/', getProducts);             // Ver el catálogo
router.get('/categorias', getCategories); // Ver todas las categorías
router.get('/categorias/:id', getCategoryById); // Ver una categoría específica
router.get('/categorias/:id/subcategorias', getSubcategorias); // Ver subcategorías de una categoría

// ==========================================
// 🔒 RUTAS PRIVADAS (Solo Admin)
// ==========================================
// El orden importa: Primero verifica token -> Luego verifica Rol -> Luego ejecuta controlador

// --- RUTAS DE PRODUCTOS ---
router.post('/', authenticateToken, requireAdmin, createProduct);
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

// --- RUTAS DE CATEGORÍAS ---
router.post('/categorias', authenticateToken, requireAdmin, createCategory);
router.put('/categorias/:id', authenticateToken, requireAdmin, updateCategory);
router.post('/categorias/:id/status', authenticateToken, requireAdmin, toggleCategoryStatus);
router.delete('/categorias/:id', authenticateToken, requireAdmin, deleteCategory);

export default router;