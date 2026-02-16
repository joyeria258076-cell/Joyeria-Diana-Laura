import { Request, Response } from 'express';
import { pool } from '../../config/database';

// --- CATEGORÍAS ---
export const getCategories = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM categorias WHERE activo = true ORDER BY nombre ASC');
        res.status(200).json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) return res.status(400).json({ success: false, message: 'Nombre requerido' });

        const result = await pool.query(
            'INSERT INTO categorias (nombre, descripcion, activo) VALUES ($1, $2, true) RETURNING *',
            [nombre, descripcion]
        );
        res.status(201).json({ success: true, message: 'Categoría creada', category: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') return res.status(400).json({ success: false, message: 'Categoría duplicada' });
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- PRODUCTOS ---
export const getProducts = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT p.*, c.nombre as categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = true
            ORDER BY p.id DESC
        `;
        const result = await pool.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { nombre, descripcion, precio, categoria_id, categoria_nombre, imagen, stock } = req.body;

        if (!nombre || !precio) {
            return res.status(400).json({ success: false, message: 'Datos incompletos' });
        }

        let idFinal = categoria_id;

        // 🎯 LÓGICA INTELIGENTE: Si no hay ID pero hay nombre, buscar o crear categoría
        if ((!idFinal || idFinal === 0 || idFinal === "0") && categoria_nombre) {
            // 1. Buscar si ya existe la categoría (insensible a mayúsculas)
            const catExistente = await pool.query(
                'SELECT id FROM categorias WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
                [categoria_nombre]
            );

            if (catExistente.rows.length > 0) {
                idFinal = catExistente.rows[0].id;
            } else {
                // 2. Si no existe, crearla
                const nuevaCat = await pool.query(
                    'INSERT INTO categorias (nombre, activo) VALUES ($1, true) RETURNING id',
                    [categoria_nombre]
                );
                idFinal = nuevaCat.rows[0].id;
            }
        }

        // Si después de todo no hay idFinal, asignar una por defecto (opcional) o dar error
        if (!idFinal) {
            return res.status(400).json({ success: false, message: 'Se requiere una categoría válida o un nombre de categoría nuevo' });
        }

        const query = `
            INSERT INTO productos (nombre, descripcion, precio, categoria_id, imagen, stock, activo)
            VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *
        `;
        const values = [nombre, descripcion, parseFloat(precio), idFinal, imagen || '', parseInt(stock) || 0];
        
        const result = await pool.query(query, values);
        res.status(201).json({ success: true, message: 'Producto creado', product: result.rows[0] });
    } catch (error: any) {
        console.error("Error en createProduct:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        await pool.query('UPDATE productos SET activo = false WHERE id = $1', [req.params.id]);
        res.status(200).json({ success: true, message: 'Producto eliminado' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};