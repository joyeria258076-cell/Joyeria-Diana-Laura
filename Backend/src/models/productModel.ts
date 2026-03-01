import { pool } from '../config/database';

// ==========================================
// MODELO DE CATEGORÍAS
// ==========================================
export const CategoryModel = {
    // Obtener todas las categorías activas
    getAll: async () => {
        const result = await pool.query('SELECT * FROM categorias ORDER BY nombre ASC');
        return result.rows;
    },
    
    // Crear una nueva categoría
    create: async (nombre: string, descripcion?: string) => {
        const result = await pool.query(
            'INSERT INTO categorias (nombre, descripcion, activo) VALUES ($1, $2, true) RETURNING *',
            [nombre, descripcion]
        );
        return result.rows[0];
    },

    // 🔄 Cambiar estado (Activo / Inactivo)
    toggleStatus: async (id: number, activo: boolean) => {
        const result = await pool.query(
            'UPDATE categorias SET activo = $2 WHERE id = $1 RETURNING *',
            [id, activo]
        );
        return result.rows[0];
    },

    // 🗑️ Eliminar categoría definitivamente y sus productos en cascada
    delete: async (id: number) => {
        // 1. Borramos primero los productos que pertenezcan a esta categoría para evitar errores de llave foránea
        await pool.query('DELETE FROM productos WHERE categoria_id = $1', [id]);
        
        // 2. Ahora sí, borramos la categoría de forma segura
        const result = await pool.query('DELETE FROM categorias WHERE id = $1', [id]);
        return result.rowCount; // Devuelve la cantidad de filas afectadas
    }
};

// ==========================================
// MODELO DE PRODUCTOS
// ==========================================
export const ProductModel = {
    // Obtener todos los productos y ocultar el nombre de la categoría si está inactiva
        getAll: async () => {
            const query = `
                SELECT p.*, 
                    CASE WHEN c.activo = true THEN c.nombre ELSE NULL END as categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.activo = true
                ORDER BY p.id DESC
            `;
            const result = await pool.query(query);
            return result.rows;
        },

    // Crear un nuevo producto (ahora exige el categoria_id)
    create: async (nombre: string, descripcion: string, precio: number, categoria_id: number, imagen: string, stock: number) => {
        const query = `
            INSERT INTO productos (nombre, descripcion, precio, categoria_id, imagen, stock, activo)
            VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *
        `;
        const values = [nombre, descripcion, precio, categoria_id, imagen, stock];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Dar de baja lógica a un producto
    delete: async (id: number) => {
        await pool.query('UPDATE productos SET activo = false WHERE id = $1', [id]);
        return true;
    }
};