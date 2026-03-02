import { Request, Response } from 'express';
import { CategoryModel, ProductModel } from '../../models/productModel';

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

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { nombre, descripcion, precio, categoria_id, imagen, stock } = req.body;

        if (!nombre || !precio || !categoria_id) {
            return res.status(400).json({ success: false, message: 'Datos incompletos. Se requiere nombre, precio y una categoría.' });
        }

        const nuevoProducto = await ProductModel.create(
            nombre, 
            descripcion || '', 
            parseFloat(precio), 
            parseInt(categoria_id), 
            imagen || '', 
            parseInt(stock) || 0
        );

        res.status(201).json({ success: true, message: 'Producto creado', product: nuevoProducto });
    } catch (error: any) {
        console.error("Error en createProduct:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        await ProductModel.delete(parseInt(req.params.id));
        res.status(200).json({ success: true, message: 'Producto eliminado' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};