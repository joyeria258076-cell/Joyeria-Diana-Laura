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

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) return res.status(400).json({ success: false, message: 'Nombre requerido' });

        const nuevaCategoria = await CategoryModel.create(nombre, descripcion);
        res.status(201).json({ success: true, message: 'Categoría creada', category: nuevaCategoria });
    } catch (error: any) {
        if (error.code === '23505') return res.status(400).json({ success: false, message: 'Categoría duplicada' });
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

        // Validamos que forzosamente envíen el ID de una categoría que ya existe
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

export const toggleCategoryStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;
        // Llamaremos a tu modelo de base de datos en el siguiente paso
        await CategoryModel.toggleStatus(parseInt(id), activo);
        res.status(200).json({ success: true, message: 'Estado de categoría actualizado' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Llamaremos a tu modelo para eliminar en cascada
        await CategoryModel.delete(parseInt(id));
        res.status(200).json({ success: true, message: 'Categoría eliminada con éxito' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};