// Ruta: Backend/src/models/carritoModel.ts
import { pool } from '../config/database';

// ── CARRITO ───────────────────────────────────────────────────
export const CarritoModel = {

    getByUsuario: async (usuario_id: number) => {
        const result = await pool.query(`
            SELECT
                c.id,
                c.usuario_id,
                c.producto_id,
                c.cantidad,
                c.talla_medida,
                c.nota,
                c.fecha_agregado,
                p.nombre            AS producto_nombre,
                p.imagen_principal  AS producto_imagen,
                p.precio_venta,
                p.precio_oferta,
                p.stock_actual,
                p.permite_personalizacion,
                p.tiene_medidas,
                cat.nombre          AS categoria_nombre
            FROM carrito c
            JOIN productos  p   ON c.producto_id  = p.id
            JOIN categorias cat ON p.categoria_id = cat.id
            WHERE c.usuario_id = $1 AND p.activo = true
            ORDER BY c.fecha_agregado DESC
        `, [usuario_id]);
        return result.rows;
    },

    upsert: async (usuario_id: number, producto_id: number, cantidad: number, talla_medida?: string, nota?: string) => {
        const result = await pool.query(`
            INSERT INTO carrito (usuario_id, producto_id, cantidad, talla_medida, nota)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (usuario_id, producto_id, talla_medida)
            DO UPDATE SET
                cantidad       = carrito.cantidad + EXCLUDED.cantidad,
                nota           = COALESCE(EXCLUDED.nota, carrito.nota),
                fecha_agregado = CURRENT_TIMESTAMP
            RETURNING *
        `, [usuario_id, producto_id, cantidad, talla_medida || null, nota || null]);
        return result.rows[0];
    },

    updateCantidad: async (id: number, usuario_id: number, cantidad: number) => {
        const result = await pool.query(`
            UPDATE carrito SET cantidad = $1
            WHERE id = $2 AND usuario_id = $3
            RETURNING *
        `, [cantidad, id, usuario_id]);
        return result.rows[0];
    },

    deleteItem: async (id: number, usuario_id: number) => {
        const result = await pool.query(`
            DELETE FROM carrito WHERE id = $1 AND usuario_id = $2 RETURNING id
        `, [id, usuario_id]);
        return result.rowCount;
    },

    clearByUsuario: async (usuario_id: number) => {
        await pool.query(`DELETE FROM carrito WHERE usuario_id = $1`, [usuario_id]);
    },

    countByUsuario: async (usuario_id: number): Promise<number> => {
        const result = await pool.query(`
            SELECT COALESCE(SUM(cantidad), 0) AS total
            FROM carrito WHERE usuario_id = $1
        `, [usuario_id]);
        return parseInt(result.rows[0].total);
    }
};

// ── VENTAS (usando tablas existentes) ─────────────────────────
export const VentaModel = {

    // Obtener o crear registro en tabla clientes para un usuario
    getOrCreateCliente: async (usuario_id: number, email: string, nombre: string): Promise<number> => {
        // Buscar cliente existente
        const existing = await pool.query(
            `SELECT id FROM clientes WHERE user_id = $1 LIMIT 1`,
            [usuario_id]
        );
        if (existing.rows.length > 0) return existing.rows[0].id;

        // Crear cliente nuevo
        const created = await pool.query(`
            INSERT INTO clientes (user_id, nombre, email, activo, fecha_creacion, fecha_actualizacion)
            VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        `, [usuario_id, nombre, email]);
        return created.rows[0].id;
    },

    // Obtener ID del método de pago MercadoPago
    getMetodoPagoId: async (): Promise<number | null> => {
        const result = await pool.query(
            `SELECT id FROM metodos_pago WHERE codigo = 'mercadopago' AND activo = true LIMIT 1`
        );
        return result.rows.length > 0 ? result.rows[0].id : null;
    },

    // Crear venta desde carrito
    create: async (data: {
        cliente_id:     number;
        usuario_id:     number;
        cliente_nombre: string;
        cliente_email:  string;
        metodo_pago_id: number;
        direccion_envio: string;
        notas_cliente?: string;
        items: {
            producto_id:     number;
            producto_codigo: string;
            producto_nombre: string;
            producto_imagen?: string;
            cantidad:        number;
            precio_unitario: number;
        }[];
    }) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const subtotal = data.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
            const iva      = subtotal * 0.16;
            const total    = subtotal + iva;
            const folio    = 'DL-' + Date.now();

            // Insertar venta
            const ventaResult = await client.query(`
                INSERT INTO ventas (
                    folio, cliente_id, metodo_pago_id,
                    cliente_nombre_completo, cliente_email,
                    subtotal, iva, total,
                    total_articulos, notas_cliente,
                    estado, creado_por, actualizado_por,
                    fecha_creacion, fecha_actualizacion
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    'pendiente', $11, $11,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                ) RETURNING *
            `, [
                folio, data.cliente_id, data.metodo_pago_id,
                data.cliente_nombre, data.cliente_email,
                subtotal, iva, total,
                data.items.reduce((s, i) => s + i.cantidad, 0),
                data.notas_cliente || null,
                data.usuario_id
            ]);

            const venta = ventaResult.rows[0];

            // Insertar detalle
            for (const item of data.items) {
                await client.query(`
                    INSERT INTO detalle_ventas (
                        venta_id, producto_id, producto_codigo,
                        producto_nombre, producto_imagen,
                        cantidad, precio_unitario, subtotal
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                `, [
                    venta.id, item.producto_id, item.producto_codigo,
                    item.producto_nombre, item.producto_imagen || null,
                    item.cantidad, item.precio_unitario,
                    item.cantidad * item.precio_unitario
                ]);
            }

            // Vaciar carrito
            await client.query(`DELETE FROM carrito WHERE usuario_id = $1`, [data.usuario_id]);

            await client.query('COMMIT');
            return venta;

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    // Obtener ventas de un cliente (para la pantalla "Mis Pedidos")
    getByUsuario: async (usuario_id: number) => {
        const result = await pool.query(`
            SELECT
                v.*,
                ut.nombre AS trabajador_nombre,
                (
                    SELECT json_agg(json_build_object(
                        'id',               dv.id,
                        'producto_id',      dv.producto_id,
                        'producto_nombre',  dv.producto_nombre,
                        'producto_imagen',  dv.producto_imagen,
                        'cantidad',         dv.cantidad,
                        'precio_unitario',  dv.precio_unitario,
                        'subtotal',         dv.subtotal
                    ))
                    FROM detalle_ventas dv WHERE dv.venta_id = v.id
                ) AS items
            FROM ventas v
            LEFT JOIN usuarios ut ON v.actualizado_por = ut.id
            WHERE v.creado_por = $1
            ORDER BY v.fecha_creacion DESC
        `, [usuario_id]);
        return result.rows;
    },

    // Obtener todas las ventas (para trabajador/admin)
    getAll: async (filtros?: { estado?: string }) => {
        let query = `
            SELECT
                v.*,
                c.nombre            AS cliente_nombre,
                c.email             AS cliente_email,
                ut.nombre           AS trabajador_nombre,
                (SELECT COUNT(*) FROM detalle_ventas dv WHERE dv.venta_id = v.id) AS total_items
            FROM ventas v
            JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN usuarios ut ON v.actualizado_por = ut.id
            WHERE 1=1
        `;
        const params: any[] = [];
        if (filtros?.estado) {
            query += ` AND v.estado = $1`;
            params.push(filtros.estado);
        }
        query += ` ORDER BY v.fecha_creacion DESC`;
        const result = await pool.query(query, params);
        return result.rows;
    },

    // Obtener venta por ID con detalle completo
    getById: async (id: number) => {
        const result = await pool.query(`
            SELECT
                v.*,
                c.nombre  AS cliente_nombre_reg,
                c.email   AS cliente_email_reg,
                ut.nombre AS trabajador_nombre,
                (
                    SELECT json_agg(json_build_object(
                        'id',               dv.id,
                        'producto_id',      dv.producto_id,
                        'producto_nombre',  dv.producto_nombre,
                        'producto_imagen',  dv.producto_imagen,
                        'cantidad',         dv.cantidad,
                        'precio_unitario',  dv.precio_unitario,
                        'subtotal',         dv.subtotal
                    ))
                    FROM detalle_ventas dv WHERE dv.venta_id = v.id
                ) AS items
            FROM ventas v
            JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN usuarios ut ON v.actualizado_por = ut.id
            WHERE v.id = $1
        `, [id]);
        return result.rows[0];
    },

    // Actualizar estado (para trabajador/admin)
    updateEstado: async (id: number, estado: string, trabajador_id: number, notas_internas?: string) => {
        const campos = ['estado = $2', 'actualizado_por = $3', 'fecha_actualizacion = CURRENT_TIMESTAMP'];
        const valores: any[] = [id, estado, trabajador_id];
        let i = 4;

        if (notas_internas !== undefined) {
            campos.push(`notas_internas = $${i++}`);
            valores.push(notas_internas);
        }

        const result = await pool.query(`
            UPDATE ventas SET ${campos.join(', ')} WHERE id = $1 RETURNING *
        `, valores);
        return result.rows[0];
    },

    // Guardar preference_id de MercadoPago en transacciones_pago
    crearTransaccion: async (venta_id: number, metodo_pago_id: number, monto: number, preference_id: string) => {
        const result = await pool.query(`
            INSERT INTO transacciones_pago (
                venta_id, metodo_pago_id, monto, moneda,
                monto_neto, estado, transaction_id,
                fecha_creacion, fecha_actualizacion
            ) VALUES ($1, $2, $3, 'MXN', $3, 'pendiente', $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
        `, [venta_id, metodo_pago_id, monto, preference_id]);
        return result.rows[0];
    },

    // Confirmar pago recibido de MercadoPago
    confirmarPago: async (payment_id: string, preference_id: string) => {
        const result = await pool.query(`
            UPDATE transacciones_pago
            SET estado = 'aprobado',
                transaction_id = $1,
                fecha_aprobacion = CURRENT_TIMESTAMP,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE transaction_id = $2
            RETURNING venta_id
        `, [payment_id, preference_id]);

        if (result.rows.length > 0) {
            await pool.query(`
                UPDATE ventas
                SET estado = 'confirmado', fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [result.rows[0].venta_id]);
        }

        return result.rows[0];
    }
};