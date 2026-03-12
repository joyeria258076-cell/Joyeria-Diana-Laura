import { Request, Response } from 'express';
import { pool } from '../../config/database';
import { CategoryModel, ProductModel, ProveedorModel, TemporadaModel, TipoProductoModel, ConfiguracionModel } from '../../models/productModel';

// --- CATEGORÍAS ---
export const getCategories = async (req: Request, res: Response) => {
    try {
        const categorias = await CategoryModel.getAll();
        res.status(200).json({ success: true, data: categorias });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const categoria = await CategoryModel.getById(parseInt(id));
        
        if (!categoria) {
            return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
        }
        
        res.status(200).json({ success: true, data: categoria });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSubcategorias = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const subcategorias = await CategoryModel.getSubcategorias(parseInt(id));
        res.status(200).json({ success: true, data: subcategorias });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { nombre, descripcion, categoria_padre_id, imagen_url, orden, creado_por } = req.body;
        
        if (!nombre || nombre.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'El nombre de la categoría es requerido' });
        }

        if (nombre.length > 100) {
            return res.status(400).json({ success: false, message: 'El nombre no puede exceder 100 caracteres' });
        }

        const nuevaCategoria = await CategoryModel.create({
            nombre: nombre.trim(),
            descripcion: descripcion?.trim() || undefined,
            categoria_padre_id: categoria_padre_id || null,
            imagen_url: imagen_url || undefined,
            orden: orden || 0,
            creado_por: creado_por || null
        });

        res.status(201).json({ 
            success: true, 
            message: 'Categoría creada exitosamente', 
            data: nuevaCategoria 
        });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Categoría duplicada' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ success: false, message: 'Categoría padre no existe' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, categoria_padre_id, imagen_url, orden, activo } = req.body;

        const categoria = await CategoryModel.getById(parseInt(id));
        if (!categoria) {
            return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
        }

        if (nombre && nombre.length > 100) {
            return res.status(400).json({ success: false, message: 'El nombre no puede exceder 100 caracteres' });
        }

        const categoriaActualizada = await CategoryModel.update(parseInt(id), {
            nombre: nombre?.trim(),
            descripcion: descripcion?.trim(),
            categoria_padre_id,
            imagen_url,
            orden,
            activo
        });

        res.status(200).json({ 
            success: true, 
            message: 'Categoría actualizada exitosamente', 
            data: categoriaActualizada 
        });
    } catch (error: any) {
        if (error.code === '23503') {
            return res.status(400).json({ success: false, message: 'Categoría padre no existe' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleCategoryStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;
        
        const categoria = await CategoryModel.toggleStatus(parseInt(id), activo);
        
        res.status(200).json({ 
            success: true, 
            message: 'Estado de categoría actualizado', 
            data: categoria 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const categoria = await CategoryModel.getById(parseInt(id));
        if (!categoria) {
            return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
        }
        
        await CategoryModel.delete(parseInt(id));
        res.status(200).json({ success: true, message: 'Categoría eliminada exitosamente' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- PRODUCTOS ---
export const getProducts = async (req: Request, res: Response) => {
    try {
        const productos = await ProductModel.getAll();
        res.status(200).json({ success: true, data: productos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getRecentProducts = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const productos = await ProductModel.getRecent(limit);
        res.status(200).json({ success: true, data: productos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const producto = await ProductModel.getById(parseInt(id));
        
        if (!producto) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }
        
        res.status(200).json({ success: true, data: producto });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const searchProducts = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ success: false, message: 'Término de búsqueda requerido' });
        }

        const productos = await ProductModel.search(q);
        res.status(200).json({ success: true, data: productos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const {
            nombre,
            descripcion,
            categoria_id,
            proveedor_id,
            temporada_id,
            tipo_producto_id,
            material_principal,
            peso_gramos,
            precio_compra,
            margen_ganancia,
            precio_venta,
            precio_oferta,
            stock_actual,
            stock_minimo,
            stock_maximo,
            ubicacion_fisica,
            tiene_medidas,
            medidas,
            permite_personalizacion,
            dias_fabricacion,
            imagen_principal,
            es_nuevo,
            es_destacado,
            creado_por
        } = req.body;

        if (!nombre || !categoria_id || !precio_venta) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, categoría y precio de venta son requeridos'
            });
        }

        if (nombre.length > 200) {
            return res.status(400).json({
                success: false,
                message: 'El nombre no puede exceder 200 caracteres'
            });
        }

        const nuevoProducto = await ProductModel.create({
            nombre: nombre.trim(),
            descripcion: descripcion?.trim(),
            categoria_id: parseInt(categoria_id),
            proveedor_id: proveedor_id ? parseInt(proveedor_id) : undefined,
            temporada_id: temporada_id ? parseInt(temporada_id) : undefined,
            tipo_producto_id: tipo_producto_id ? parseInt(tipo_producto_id) : undefined,
            material_principal,
            peso_gramos: peso_gramos ? parseFloat(peso_gramos) : undefined,
            precio_compra: precio_compra ? parseFloat(precio_compra) : undefined,
            margen_ganancia: margen_ganancia ? parseFloat(margen_ganancia) : undefined,
            precio_venta: parseFloat(precio_venta),
            precio_oferta: precio_oferta ? parseFloat(precio_oferta) : undefined,
            stock_actual: stock_actual ? parseInt(stock_actual) : 0,
            stock_minimo: stock_minimo ? parseInt(stock_minimo) : 5,
            stock_maximo: stock_maximo ? parseInt(stock_maximo) : 999,
            ubicacion_fisica,
            tiene_medidas: tiene_medidas === 'true' || tiene_medidas === true,
            medidas: medidas ? (typeof medidas === 'string' ? JSON.parse(medidas) : medidas) : undefined,
            permite_personalizacion: permite_personalizacion === 'true' || permite_personalizacion === true,
            dias_fabricacion: dias_fabricacion ? parseInt(dias_fabricacion) : 0,
            imagen_principal,
            es_nuevo: es_nuevo === 'true' || es_nuevo === true,
            es_destacado: es_destacado === 'true' || es_destacado === true,
            creado_por: creado_por ? parseInt(creado_por) : undefined
        });

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            data: nuevoProducto
        });
    } catch (error: any) {
        console.error('Error en createProduct:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const producto = await ProductModel.getById(parseInt(id));

        if (!producto) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        const productoActualizado = await ProductModel.update(parseInt(id), req.body);

        res.status(200).json({
            success: true,
            message: 'Producto actualizado exitosamente',
            data: productoActualizado
        });
    } catch (error: any) {
        console.error('Error en updateProduct:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const producto = await ProductModel.getById(parseInt(id));

        if (!producto) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        await ProductModel.delete(parseInt(id));
        res.status(200).json({ success: true, message: 'Producto eliminado exitosamente' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- PROVEEDORES ---
export const getProveedores = async (req: Request, res: Response) => {
    try {
        const proveedores = await ProveedorModel.getAll();
        res.status(200).json({ success: true, data: proveedores });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getProveedorById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const proveedor = await ProveedorModel.getById(parseInt(id));
        
        if (!proveedor) {
            return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
        }
        
        res.status(200).json({ success: true, data: proveedor });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- TEMPORADAS ---
export const getTemporadas = async (req: Request, res: Response) => {
    try {
        const temporadas = await TemporadaModel.getAll();
        res.status(200).json({ success: true, data: temporadas });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTemporadaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const temporada = await TemporadaModel.getById(parseInt(id));
        
        if (!temporada) {
            return res.status(404).json({ success: false, message: 'Temporada no encontrada' });
        }
        
        res.status(200).json({ success: true, data: temporada });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- TIPOS DE PRODUCTO ---
export const getTiposProducto = async (req: Request, res: Response) => {
    try {
        const tipos = await TipoProductoModel.getAll();
        res.status(200).json({ success: true, data: tipos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTipoProductoById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const tipo = await TipoProductoModel.getById(parseInt(id));
        
        if (!tipo) {
            return res.status(404).json({ success: false, message: 'Tipo de producto no encontrado' });
        }
        
        res.status(200).json({ success: true, data: tipo });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- CONFIGURACIÓN ---
export const getConfiguracion = async (req: Request, res: Response) => {
    try {
        const config = await ConfiguracionModel.getAll();
        res.status(200).json({ success: true, data: config });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getConfiguracionByClave = async (req: Request, res: Response) => {
    try {
        const { clave } = req.params;
        const config = await ConfiguracionModel.getByClave(clave);
        
        if (!config) {
            return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
        }
        
        res.status(200).json({ success: true, data: config });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getConfiguracionByCategoria = async (req: Request, res: Response) => {
    try {
        const { categoria } = req.params;
        const config = await ConfiguracionModel.getByCategoria(categoria);
        res.status(200).json({ success: true, data: config });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- BÚSQUEDA Y FILTROS AVANZADOS (Pública) ---
export const searchAndFilterProducts = async (req: Request, res: Response) => {
    try {
        const {
            nombre,
            categoria_id,
            tipo_producto_id,
            material_principal,
            precio_min,
            precio_max,
            limit = 20,
            offset = 0
        } = req.query;

        let query = `
            SELECT 
                id, nombre, descripcion, categoria_id, categoria_nombre,
                tipo_producto_id, tipo_nombre, material_principal,
                precio_venta, precio_oferta, imagen_principal,
                stock_actual, es_nuevo, es_destacado
            FROM productos
            WHERE activo = true
        `;
        const params: any[] = [];
        let paramCount = 1;

        // Filtrar por nombre
        if (nombre && typeof nombre === 'string') {
            query += ` AND LOWER(nombre) LIKE LOWER($${paramCount})`;
            params.push(`%${nombre}%`);
            paramCount++;
        }

        // Filtrar por categoría
        if (categoria_id && categoria_id !== '') {
            query += ` AND categoria_id = $${paramCount}`;
            params.push(parseInt(categoria_id as string));
            paramCount++;
        }

        // Filtrar por tipo de producto
        if (tipo_producto_id && tipo_producto_id !== '') {
            query += ` AND tipo_producto_id = $${paramCount}`;
            params.push(parseInt(tipo_producto_id as string));
            paramCount++;
        }

        // Filtrar por material
        if (material_principal && material_principal !== '') {
            query += ` AND LOWER(material_principal) = LOWER($${paramCount})`;
            params.push(material_principal as string);
            paramCount++;
        }

        // Filtrar por rango de precio (precio_venta)
        if (precio_min && precio_min !== '') {
            query += ` AND precio_venta >= $${paramCount}`;
            params.push(parseFloat(precio_min as string));
            paramCount++;
        }

        if (precio_max && precio_max !== '') {
            query += ` AND precio_venta <= $${paramCount}`;
            params.push(parseFloat(precio_max as string));
            paramCount++;
        }

        // Ordenar y paginar
        query += ` ORDER BY es_destacado DESC, nombre ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit as string));
        params.push(parseInt(offset as string));

        const result = await pool.query(query, params);
        
        res.status(200).json({ 
            success: true, 
            data: result.rows,
            total: result.rows.length
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- OBTENER PRODUCTOS POR CATEGORÍA CON LÍMITE ---
export const getProductsByCategory = async (req: Request, res: Response) => {
    try {
        const { id: categoria_id } = req.params;
        const { limit = 4 } = req.query;

        const result = await pool.query(
            `SELECT 
                id, nombre, descripcion, categoria_id, categoria_nombre,
                tipo_producto_id, material_principal, precio_venta, precio_oferta,
                imagen_principal, stock_actual, es_nuevo
            FROM productos
            WHERE categoria_id = $1 AND activo = true
            ORDER BY es_nuevo DESC, nombre ASC
            LIMIT $2`,
            [parseInt(categoria_id as string), parseInt(limit as string)]
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- OBTENER PRODUCTOS PARA VISTA PÚBLICA (Categorías con productos) ---
export const getProductsByCategories = async (req: Request, res: Response) => {
    try {
        const { limit = 4 } = req.query;

        interface Categoria {
            id: number;
            nombre: string;
        }

        interface ProductoAgregado {
            categoria_id: number;
            categoria_nombre: string;
            productos: any[];
            total: number;
        }

        // Obtener todas las categorías activas
        const categoriasResult = await pool.query(
            `SELECT DISTINCT id, nombre FROM categorias WHERE activo = true ORDER BY nombre ASC`
        );

        const respuesta = await Promise.all(
            categoriasResult.rows.map(async (cat: Categoria) => {
                const productosResult = await pool.query(
                    `SELECT 
                        id, nombre, descripcion, categoria_id, categoria_nombre,
                        material_principal, precio_venta, precio_oferta,
                        imagen_principal, stock_actual, es_nuevo
                    FROM productos
                    WHERE categoria_id = $1 AND activo = true
                    ORDER BY es_nuevo DESC, nombre ASC
                    LIMIT $2`,
                    [cat.id, parseInt(limit as string)]
                );

                return {
                    categoria_id: cat.id,
                    categoria_nombre: cat.nombre,
                    productos: productosResult.rows,
                    total: productosResult.rows.length
                } as ProductoAgregado;
            })
        );

        // Filtrar solo categorías con productos
        const categoriasConProductos = respuesta.filter((cat: ProductoAgregado) => cat.total > 0);

        res.status(200).json({ 
            success: true, 
            data: categoriasConProductos 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};