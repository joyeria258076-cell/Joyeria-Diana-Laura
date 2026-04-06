// Backend/src/routes/productRoutes.ts
import { Router } from 'express';
import { 
    getProducts, 
    getRecentProducts,
    getProductById,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getCategories,
    getCategoryById,
    getSubcategorias,
    createCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    getProveedores,
    getProveedorById,
    getTemporadas,
    getTemporadaById,
    getTiposProducto,
    getTipoProductoById,
    getConfiguracion,
    getConfiguracionByClave,
    getConfiguracionByCategoria,
    searchAndFilterProducts,
    getProductsByCategory,
    getProductsByCategories
} from '../controllers/producto/productoController';

import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// ==========================================
// 🔓 RUTAS PÚBLICAS (Cualquiera puede verlas)
// ==========================================
// ⚠️ IMPORTANTE: Las rutas específicas deben ir ANTES que las rutas genéricas (/:id)
// De lo contrario, Express interpretará "categorias" como un ID
router.get('/', getProducts);                    // Ver el catálogo de productos
router.get('/recent', getRecentProducts);        // Ver productos recientes
router.get('/search', searchProducts);           // Buscar productos (búsqueda simple)
router.get('/filter', searchAndFilterProducts);  // 🔍 NUEVA: Búsqueda avanzada con filtros
router.get('/por-categorias', getProductsByCategories); // 🆕 NUEVA: Todos los productos agrupados por categoría

// --- RUTAS DE CATEGORÍAS ---
router.get('/categorias', getCategories);        // Ver todas las categorías ⚠️ ANTES de /:id
router.get('/categorias/:id', getCategoryById);  // Ver una categoría específica
router.get('/categorias/:id/subcategorias', getSubcategorias); // Ver subcategorías de una categoría
router.get('/categorias/:id/productos', getProductsByCategory); // 🆕 NUEVA: Productos de una categoría específica

// --- RUTAS DE PROVEEDORES ---
router.get('/proveedores', getProveedores);      // Ver todos los proveedores
router.get('/proveedores/:id', getProveedorById); // Ver un proveedor específico

// --- RUTAS DE TEMPORADAS ---
router.get('/temporadas', getTemporadas);        // Ver todas las temporadas
router.get('/temporadas/:id', getTemporadaById); // Ver una temporada específica

// --- RUTAS DE TIPOS DE PRODUCTO ---
router.get('/tipos-producto', getTiposProducto); // Ver todos los tipos de producto
router.get('/tipos-producto/:id', getTipoProductoById); // Ver un tipo específico

// --- RUTAS DE CONFIGURACIÓN ---
router.get('/configuracion', getConfiguracion); // Ver toda la configuración
router.get('/configuracion/clave/:clave', getConfiguracionByClave); // Ver config por clave
router.get('/configuracion/categoria/:categoria', getConfiguracionByCategoria); // Ver config por categoría

router.get('/:id', getProductById);              // Ver producto específico (ÚLTIMA ruta genérica)

// ==========================================
// 🔒 RUTAS PRIVADAS (Solo Admin)
// ==========================================
// El orden importa: Primero verifica token -> Luego verifica Rol -> Luego ejecuta controlador

// --- RUTAS DE PRODUCTOS ---
router.post('/', authenticateToken, requireAdmin, createProduct);
router.put('/:id', authenticateToken, requireAdmin, updateProduct);
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

// --- RUTAS DE CATEGORÍAS ---
router.post('/categorias', authenticateToken, requireAdmin, createCategory);
router.put('/categorias/:id', authenticateToken, requireAdmin, updateCategory);
router.post('/categorias/:id/status', authenticateToken, requireAdmin, toggleCategoryStatus);
router.delete('/categorias/:id', authenticateToken, requireAdmin, deleteCategory);

export default router;