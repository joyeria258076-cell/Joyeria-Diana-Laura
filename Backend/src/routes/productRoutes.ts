import { Router } from 'express';
// 1. Importamos TODOS los controladores, incluyendo los dos nuevos al final
import { 
    getProducts, 
    createProduct, 
    deleteProduct,
    getCategories,
    createCategory,
    toggleCategoryStatus, // 👈 NUEVO: Función para ocultar/mostrar
    deleteCategory        // 👈 NUEVO: Función para eliminar en cascada
} from '../controllers/producto/productoController';

import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// ==========================================
// 🔓 RUTAS PÚBLICAS (Cualquiera puede verlas)
// ==========================================
router.get('/', getProducts);             // Ver el catálogo
router.get('/categorias', getCategories); // Ver las categorías para el filtro

// ==========================================
// 🔒 RUTAS PRIVADAS (Solo Admin)
// ==========================================
// El orden importa: Primero verifica token -> Luego verifica Rol -> Luego ejecuta controlador

// --- RUTAS DE PRODUCTOS ---
router.post('/', authenticateToken, requireAdmin, createProduct);
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

// --- RUTAS DE CATEGORÍAS ---
router.post('/categorias', authenticateToken, requireAdmin, createCategory);

// 🌟 NUEVO: Ocultar / Mostrar categoría (Usamos POST coincidiendo con lo que pusiste en api.ts)
router.post('/categorias/:id/status', authenticateToken, requireAdmin, toggleCategoryStatus); 

// 🚨 NUEVO: Eliminar categoría definitivamente
router.delete('/categorias/:id', authenticateToken, requireAdmin, deleteCategory); 

export default router;