import { Router } from 'express';
// 1. Importamos los controladores que acabas de modificar
import { 
    getProducts, 
    createProduct, 
    deleteProduct,
    getCategories,
    createCategory
} from '../controllers/producto/productoController';

// 2. Importamos AMBOS middlewares desde el archivo authMiddleware
// (authenticateToken verifica que estés logueado, requireAdmin verifica que seas admin)
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

// Crear Producto
router.post('/', authenticateToken, requireAdmin, createProduct);

// Eliminar Producto
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

// Crear Categoría
router.post('/categorias', authenticateToken, requireAdmin, createCategory);

export default router;