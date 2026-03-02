import { pool } from '../config/database';

// ==========================================
// MODELO DE CATEGORÍAS
// ==========================================
interface CategoriaData {
    nombre: string;
    descripcion?: string;
    categoria_padre_id?: number | null;
    imagen_url?: string;
    orden?: number;
    creado_por?: number;
}

interface CategoriaUpdateData extends CategoriaData {
    activo?: boolean;
}

export const CategoryModel = {
    // Obtener todas las categorías con todos sus campos
    getAll: async () => {
        const result = await pool.query(
            `SELECT id, nombre, descripcion, categoria_padre_id, imagen_url, orden, activo, 
                    creado_por, fecha_creacion, fecha_actualizacion 
             FROM categorias 
             ORDER BY orden ASC, nombre ASC`
        );
        return result.rows;
    },

    // Obtener una categoría por ID
    getById: async (id: number) => {
        const result = await pool.query(
            `SELECT id, nombre, descripcion, categoria_padre_id, imagen_url, orden, activo, 
                    creado_por, fecha_creacion, fecha_actualizacion 
             FROM categorias 
             WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    },

    // Obtener subcategorías de una categoría padre
    getSubcategorias: async (categoriaPadreId: number) => {
        const result = await pool.query(
            `SELECT id, nombre, descripcion, categoria_padre_id, imagen_url, orden, activo, 
                    creado_por, fecha_creacion, fecha_actualizacion 
             FROM categorias 
             WHERE categoria_padre_id = $1 
             ORDER BY orden ASC, nombre ASC`,
            [categoriaPadreId]
        );
        return result.rows;
    },
    
    // Crear una nueva categoría con todos los campos
    create: async (data: CategoriaData) => {
        const { nombre, descripcion, categoria_padre_id, imagen_url, orden, creado_por } = data;
        
        const result = await pool.query(
            `INSERT INTO categorias (nombre, descripcion, categoria_padre_id, imagen_url, orden, activo, creado_por, fecha_creacion, fecha_actualizacion) 
             VALUES ($1, $2, $3, $4, $5, true, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
             RETURNING *`,
            [nombre, descripcion || null, categoria_padre_id || null, imagen_url || null, orden || 0, creado_por || null]
        );
        return result.rows[0];
    },

    // Actualizar una categoría
    update: async (id: number, data: CategoriaUpdateData) => {
        const { nombre, descripcion, categoria_padre_id, imagen_url, orden, activo } = data;
        
        // Construir dinámicamente la consulta UPDATE
        const campos: string[] = [];
        const valores: any[] = [];
        let paramCount = 1;

        if (nombre !== undefined) {
            campos.push(`nombre = $${paramCount++}`);
            valores.push(nombre);
        }
        if (descripcion !== undefined) {
            campos.push(`descripcion = $${paramCount++}`);
            valores.push(descripcion || null);
        }
        if (categoria_padre_id !== undefined) {
            campos.push(`categoria_padre_id = $${paramCount++}`);
            valores.push(categoria_padre_id || null);
        }
        if (imagen_url !== undefined) {
            campos.push(`imagen_url = $${paramCount++}`);
            valores.push(imagen_url || null);
        }
        if (orden !== undefined) {
            campos.push(`orden = $${paramCount++}`);
            valores.push(orden);
        }
        if (activo !== undefined) {
            campos.push(`activo = $${paramCount++}`);
            valores.push(activo);
        }

        // Siempre actualizar la fecha de actualización
        campos.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
        valores.push(id);

        const query = `UPDATE categorias SET ${campos.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        
        const result = await pool.query(query, valores);
        return result.rows[0];
    },

    // 🔄 Cambiar estado (Activo / Inactivo)
    toggleStatus: async (id: number, activo: boolean) => {
        const result = await pool.query(
            `UPDATE categorias 
             SET activo = $2, fecha_actualizacion = CURRENT_TIMESTAMP 
             WHERE id = $1 
             RETURNING *`,
            [id, activo]
        );
        return result.rows[0];
    },

    // 🗑️ Eliminar categoría definitivamente (soft delete mediante actualización de fecha y estado)
    delete: async (id: number) => {
        // Opción 1: Eliminar en cascada (elimina productos también)
        // await pool.query('DELETE FROM productos WHERE categoria_id = $1', [id]);
        
        // Opción 2: Soft delete (solo marca como inactivo)
        // const result = await pool.query(
        //     'UPDATE categorias SET activo = false, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        //     [id]
        // );

        // Opción 3: Hard delete definitivo (descomenta si lo necesitas)
        const result = await pool.query('DELETE FROM categorias WHERE id = $1', [id]);
        return result.rowCount;
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