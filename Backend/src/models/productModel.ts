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
interface ProductoData {
    nombre: string;
    descripcion?: string;
    categoria_id: number;
    proveedor_id?: number | null;
    temporada_id?: number | null;
    tipo_producto_id?: number | null;
    material_principal?: string;
    peso_gramos?: number | null;
    precio_compra?: number | null;
    margen_ganancia?: number | null;
    precio_venta: number;
    precio_oferta?: number | null;
    stock_actual?: number;
    stock_minimo?: number;
    stock_maximo?: number;
    ubicacion_fisica?: string;
    tiene_medidas?: boolean;
    medidas?: any;
    permite_personalizacion?: boolean;
    dias_fabricacion?: number;
    imagen_principal?: string;
    es_nuevo?: boolean;
    es_destacado?: boolean;
    activo?: boolean;
    creado_por?: number | null;
    actualizado_por?: number | null;
}

export const ProductModel = {
    // Obtener todos los productos con joins de categoría
    getAll: async () => {
        const query = `
            SELECT p.*, 
                c.nombre as categoria_nombre,
                pr.nombre as proveedor_nombre,
                t.nombre as temporada_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            LEFT JOIN temporadas t ON p.temporada_id = t.id
            WHERE p.activo = true
            ORDER BY p.fecha_creacion DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    // Obtener productos recientes (últimos 7 días)
    getRecent: async (limit: number = 10) => {
        const query = `
            SELECT p.*, 
                c.nombre as categoria_nombre,
                pr.nombre as proveedor_nombre,
                t.nombre as temporada_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            LEFT JOIN temporadas t ON p.temporada_id = t.id
            WHERE p.activo = true 
                AND p.fecha_creacion >= NOW() - INTERVAL '7 days'
            ORDER BY p.fecha_creacion DESC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return result.rows;
    },

    // Obtener un producto por ID
    getById: async (id: number) => {
        const query = `
            SELECT p.*, 
                c.nombre as categoria_nombre,
                pr.nombre as proveedor_nombre,
                t.nombre as temporada_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            LEFT JOIN temporadas t ON p.temporada_id = t.id
            WHERE p.id = $1 AND p.activo = true
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // Buscar productos
    search: async (term: string) => {
        const query = `
            SELECT p.*, 
                c.nombre as categoria_nombre,
                pr.nombre as proveedor_nombre,
                t.nombre as temporada_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
            LEFT JOIN temporadas t ON p.temporada_id = t.id
            WHERE p.activo = true 
                AND (p.nombre ILIKE $1 OR p.descripcion ILIKE $1 OR p.codigo ILIKE $1)
            ORDER BY p.nombre ASC
        `;
        const result = await pool.query(query, [`%${term}%`]);
        return result.rows;
    },

    // Crear un nuevo producto con todos los campos
    create: async (data: ProductoData) => {
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
            creado_por,
            actualizado_por
        } = data;

        // Generar código único si no existe
        const codigo = `PROD-${Date.now()}`;

        const query = `
            INSERT INTO productos (
                codigo,
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
                activo,
                creado_por,
                actualizado_por,
                fecha_creacion,
                fecha_actualizacion
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, true, $25, $26,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING *
        `;

        const values = [
            codigo,
            nombre,
            descripcion || null,
            categoria_id,
            proveedor_id || null,
            temporada_id || null,
            tipo_producto_id || null,
            material_principal || null,
            peso_gramos || null,
            precio_compra || null,
            margen_ganancia || null,
            precio_venta,
            precio_oferta || null,
            stock_actual || 0,
            stock_minimo || 5,
            stock_maximo || 999,
            ubicacion_fisica || null,
            tiene_medidas || false,
            medidas ? JSON.stringify(medidas) : null,
            permite_personalizacion || false,
            dias_fabricacion || 0,
            imagen_principal || null,
            es_nuevo || false,
            es_destacado || false,
            creado_por || null,
            actualizado_por || null
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Actualizar un producto
    update: async (id: number, data: Partial<ProductoData>) => {
        const campos: string[] = [];
        const valores: any[] = [];
        let paramCount = 1;

        const fieldsToUpdate = [
            'nombre', 'descripcion', 'categoria_id', 'proveedor_id', 'temporada_id',
            'tipo_producto_id', 'material_principal', 'peso_gramos', 'precio_compra',
            'margen_ganancia', 'precio_venta', 'precio_oferta', 'stock_actual',
            'stock_minimo', 'stock_maximo', 'ubicacion_fisica', 'tiene_medidas',
            'medidas', 'permite_personalizacion', 'dias_fabricacion', 'imagen_principal',
            'es_nuevo', 'es_destacado', 'activo', 'actualizado_por'
        ];

        fieldsToUpdate.forEach(field => {
            if (data[field as keyof ProductoData] !== undefined) {
                let value = data[field as keyof ProductoData];
                // Convertir objetos a JSON
                if (field === 'medidas' && typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                campos.push(`${field} = $${paramCount++}`);
                valores.push(value);
            }
        });

        if (campos.length === 0) {
            throw new Error('No hay campos para actualizar');
        }

        campos.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
        valores.push(id);

        const query = `UPDATE productos SET ${campos.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await pool.query(query, valores);
        return result.rows[0];
    },

    // Dar de baja lógica a un producto
    delete: async (id: number) => {
        const result = await pool.query(
            'UPDATE productos SET activo = false, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows[0];
    },

    // Contar productos
    count: async () => {
        const result = await pool.query('SELECT COUNT(*) FROM productos WHERE activo = true');
        return parseInt(result.rows[0].count);
    }
};

// ==========================================
// MODELO DE PROVEEDORES
// ==========================================
export const ProveedorModel = {
    getAll: async () => {
        const result = await pool.query(
            `SELECT id, nombre, razon_social, rfc, direccion, telefono, email, sitio_web, 
                    persona_contacto, notas, activo, creado_por, fecha_creacion, fecha_actualizacion 
             FROM proveedores 
             WHERE activo = true 
             ORDER BY nombre ASC`
        );
        return result.rows;
    },

    getById: async (id: number) => {
        const result = await pool.query(
            `SELECT id, nombre, razon_social, rfc, direccion, telefono, email, sitio_web, 
                    persona_contacto, notas, activo, creado_por, fecha_creacion, fecha_actualizacion 
             FROM proveedores 
             WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    }
};

// ==========================================
// MODELO DE TEMPORADAS
// ==========================================
export const TemporadaModel = {
    getAll: async () => {
        const result = await pool.query(
            `SELECT id, nombre, descripcion, fecha_inicio, fecha_fin, imagen_url, activo, creado_por, fecha_creacion, fecha_actualizacion 
             FROM temporadas 
             WHERE activo = true 
             ORDER BY fecha_inicio DESC`
        );
        return result.rows;
    },

    getById: async (id: number) => {
        const result = await pool.query(
            `SELECT id, nombre, descripcion, fecha_inicio, fecha_fin, imagen_url, activo, creado_por, fecha_creacion, fecha_actualizacion 
             FROM temporadas 
             WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    }
};

// ==========================================
// MODELO DE TIPOS DE PRODUCTO
// ==========================================
export const TipoProductoModel = {
    getAll: async () => {
        const result = await pool.query(
            `SELECT id, nombre, descripcion, activo, creado_por, fecha_creacion 
             FROM tipos_producto 
             WHERE activo = true 
             ORDER BY nombre ASC`
        );
        return result.rows;
    },

    getById: async (id: number) => {
        const result = await pool.query(
            `SELECT id, nombre, descripcion, activo, creado_por, fecha_creacion 
             FROM tipos_producto 
             WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    }
};

// ==========================================
// MODELO DE CONFIGURACIÓN
// ==========================================
export const ConfiguracionModel = {
    getAll: async () => {
        const result = await pool.query(
            `SELECT id, clave, valor, tipo_dato, descripcion, categoria 
             FROM configuracion 
             ORDER BY categoria ASC, clave ASC`
        );
        return result.rows;
    },

    getByClave: async (clave: string) => {
        const result = await pool.query(
            `SELECT id, clave, valor, tipo_dato, descripcion, categoria 
             FROM configuracion 
             WHERE clave = $1`,
            [clave]
        );
        return result.rows[0];
    },

    getByCategoria: async (categoria: string) => {
        const result = await pool.query(
            `SELECT id, clave, valor, tipo_dato, descripcion, categoria 
             FROM configuracion 
             WHERE categoria = $1 
             ORDER BY clave ASC`,
            [categoria]
        );
        return result.rows;
    }
};