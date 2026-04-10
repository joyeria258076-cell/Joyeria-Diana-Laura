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
        return Number.parseInt(result.rows[0].total);
    }
};

// ── VENTAS ────────────────────────────────────────────────────
export const VentaModel = {

    getOrCreateCliente: async (usuario_id: number, email: string, nombre: string): Promise<number> => {
        const existing = await pool.query(
            `SELECT id FROM clientes WHERE user_id = $1 LIMIT 1`,
            [usuario_id]
        );
        if (existing.rows.length > 0) return existing.rows[0].id;

        const created = await pool.query(`
            INSERT INTO clientes (user_id, nombre, email, activo, fecha_creacion, fecha_actualizacion)
            VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        `, [usuario_id, nombre, email]);
        return created.rows[0].id;
    },

    getMetodosPago: async () => {
        const result = await pool.query(`
            SELECT id, nombre, codigo, tipo, es_pasarela, instrucciones_cliente
            FROM metodos_pago
            WHERE activo = true
            ORDER BY orden ASC, id ASC
        `);
        const config = await pool.query(`
            SELECT valor FROM configuracion WHERE clave = 'costo_envio_default'
        `);
        const costo_envio = config.rows.length > 0 ? parseInt(config.rows[0].valor) : 50;
        return { metodos: result.rows, costo_envio };
    },

    getMetodoPagoId: async (): Promise<number | null> => {
        const result = await pool.query(
            `SELECT id FROM metodos_pago WHERE codigo = 'mercadopago' AND activo = true LIMIT 1`
        );
        return result.rows.length > 0 ? result.rows[0].id : null;
    },

    getMetodoPagoById: async (id: number) => {
        const result = await pool.query(
            `SELECT id, nombre, codigo, tipo, es_pasarela FROM metodos_pago WHERE id = $1 AND activo = true LIMIT 1`,
            [id]
        );
        return result.rows[0] || null;
    },

    create: async (data: {
        cliente_id:      number;
        usuario_id:      number;
        cliente_nombre:  string;
        cliente_email:   string;
        metodo_pago_id:  number;
        direccion_envio: string;
        notas_cliente?:  string;
        tipo_entrega?:   string;
        costo_envio?:    number;
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

            const totalProductos = data.items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
            const costoEnvio     = data.costo_envio || 0;
            const total          = totalProductos + costoEnvio;
            const subtotal       = Number.parseFloat((totalProductos / 1.16).toFixed(2));
            const iva            = Number.parseFloat((totalProductos - subtotal).toFixed(2));
            const folio    = 'DL-' + Date.now();

            const ventaResult = await client.query(`
                INSERT INTO ventas (
                    folio, cliente_id, metodo_pago_id,
                    cliente_nombre_completo, cliente_email,
                    subtotal, iva, total, costo_envio,
                    total_articulos, notas_cliente,
                    tipo_entrega,
                    estado, creado_por, actualizado_por,
                    fecha_creacion, fecha_actualizacion
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10, $11,
                    $12,
                    'pendiente', $13, $13,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                ) RETURNING *
            `, [
                folio, data.cliente_id, data.metodo_pago_id,
                data.cliente_nombre, data.cliente_email,
                subtotal, iva, total, costoEnvio,
                data.items.reduce((s, i) => s + i.cantidad, 0),
                [data.direccion_envio, data.notas_cliente].filter(Boolean).join(' | ') || null,
                data.tipo_entrega || 'tienda',
                data.usuario_id
            ]);

            const venta = ventaResult.rows[0];

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

    getByUsuario: async (usuario_id: number) => {
        const result = await pool.query(`
            SELECT
                v.*,
                mp.nombre      AS metodo_pago_nombre,
                mp.codigo      AS metodo_pago_codigo,
                mp.tipo        AS metodo_pago_tipo,
                mp.es_pasarela AS metodo_es_pasarela,
                -- ✅ Usar trabajador_id para el nombre del trabajador asignado
                tw.nombre AS trabajador_nombre,
                COALESCE(
                    (SELECT tp.estado FROM transacciones_pago tp
                     WHERE tp.venta_id = v.id
                     ORDER BY tp.fecha_creacion DESC LIMIT 1),
                    'pendiente'
                ) AS estado_pago,
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
            LEFT JOIN metodos_pago mp ON v.metodo_pago_id = mp.id
            -- ✅ JOIN con trabajador_id, no actualizado_por
            LEFT JOIN usuarios tw ON v.trabajador_id = tw.id
            WHERE v.creado_por = $1
            ORDER BY v.fecha_creacion DESC
        `, [usuario_id]);
        return result.rows;
    },

    getAll: async (filtros?: { estado?: string }) => {
        let query = `
            SELECT
                v.*,
                mp.nombre      AS metodo_pago_nombre,
                mp.codigo      AS metodo_pago_codigo,
                mp.tipo        AS metodo_pago_tipo,
                c.nombre       AS cliente_nombre,
                c.email        AS cliente_email,
                ut.nombre      AS trabajador_nombre,
                tw.nombre      AS trabajador_asignado_nombre,
                (SELECT COUNT(*) FROM detalle_ventas dv WHERE dv.venta_id = v.id) AS total_items,
                COALESCE(
                    (SELECT tp.estado FROM transacciones_pago tp
                    WHERE tp.venta_id = v.id
                    ORDER BY tp.fecha_creacion DESC LIMIT 1),
                    'pendiente'
                ) AS estado_pago,
                EXTRACT(EPOCH FROM (NOW() - v.fecha_actualizacion))/60 AS minutos_sin_pago,
                v.fecha_limite_pago
            FROM ventas v
            JOIN clientes c ON v.cliente_id = c.id
            LEFT JOIN metodos_pago mp ON v.metodo_pago_id = mp.id
            LEFT JOIN usuarios ut ON v.actualizado_por = ut.id
            LEFT JOIN usuarios tw ON v.trabajador_id = tw.id
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

    getById: async (id: number) => {
        const result = await pool.query(`
            SELECT
                v.*,
                mp.nombre                AS metodo_pago_nombre,
                mp.codigo                AS metodo_pago_codigo,
                mp.tipo                  AS metodo_pago_tipo,
                mp.es_pasarela           AS metodo_es_pasarela,
                mp.instrucciones_cliente AS metodo_instrucciones,
                c.nombre  AS cliente_nombre_reg,
                c.email   AS cliente_email_reg,
                -- ✅ Usar trabajador_id para el nombre del trabajador asignado
                tw.nombre AS trabajador_nombre,
                COALESCE(
                    (SELECT tp.estado FROM transacciones_pago tp
                     WHERE tp.venta_id = v.id
                     ORDER BY tp.fecha_creacion DESC LIMIT 1),
                    'pendiente'
                ) AS estado_pago,
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
            LEFT JOIN metodos_pago mp ON v.metodo_pago_id = mp.id
            -- ✅ JOIN con trabajador_id, no actualizado_por
            LEFT JOIN usuarios tw ON v.trabajador_id = tw.id
            WHERE v.id = $1
        `, [id]);
        return result.rows[0];
    },

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

    editarDetalles: async (id: number, data: {
        direccion_envio?: string;
        notas_internas?: string;
        fecha_estimada_entrega?: string;
        numero_guia?: string;
        paqueteria?: string;
        trabajador_id?: number;
    }) => {
        const campos: string[] = ['fecha_actualizacion = CURRENT_TIMESTAMP'];
        const valores: any[] = [id];
        let i = 2;

        if (data.trabajador_id !== undefined) {
            campos.push(`actualizado_por = $${i++}`);
            valores.push(data.trabajador_id);
        }
        if (data.direccion_envio !== undefined) {
            campos.push(`notas_cliente = $${i++}`);
            valores.push(data.direccion_envio);
        }
        if (data.notas_internas !== undefined) {
            campos.push(`notas_internas = $${i++}`);
            valores.push(data.notas_internas);
        }
        if (data.fecha_estimada_entrega !== undefined) {
            campos.push(`fecha_estimada_entrega = $${i++}`);
            valores.push(data.fecha_estimada_entrega || null);
        }
        if (data.numero_guia !== undefined) {
            campos.push(`numero_guia = $${i++}`);
            valores.push(data.numero_guia || null);
        }
        if (data.paqueteria !== undefined) {
            campos.push(`paqueteria = $${i++}`);
            valores.push(data.paqueteria || null);
        }

        const result = await pool.query(`
            UPDATE ventas SET ${campos.join(', ')} WHERE id = $1 RETURNING *
        `, valores);
        return result.rows[0];
    },

    editarCantidadItem: async (detalle_id: number, venta_id: number, cantidad: number) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const detalle = await client.query(
                `SELECT * FROM detalle_ventas WHERE id = $1 AND venta_id = $2`,
                [detalle_id, venta_id]
            );
            if (!detalle.rows.length) throw new Error('Item no encontrado');

            const item = detalle.rows[0];
            const nuevoSubtotal = item.precio_unitario * cantidad;

            await client.query(`
                UPDATE detalle_ventas SET cantidad = $1, subtotal = $2 WHERE id = $3
            `, [cantidad, nuevoSubtotal, detalle_id]);

            const totales = await client.query(`
                SELECT SUM(subtotal) AS total FROM detalle_ventas WHERE venta_id = $1
            `, [venta_id]);

            const total    = Number.parseFloat(totales.rows[0].total);
            const subtotal = Number.parseFloat((total / 1.16).toFixed(2));
            const iva      = Number.parseFloat((total - subtotal).toFixed(2));

            await client.query(`
                UPDATE ventas SET subtotal = $1, iva = $2, total = $3, fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id = $4
            `, [subtotal, iva, total, venta_id]);

            await client.query('COMMIT');
            return { detalle_id, cantidad, subtotal: nuevoSubtotal };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    eliminarItem: async (detalle_id: number, venta_id: number) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const count = await client.query(
                `SELECT COUNT(*) FROM detalle_ventas WHERE venta_id = $1`, [venta_id]
            );
            if (Number.parseInt(count.rows[0].count) <= 1)
                throw new Error('No puedes eliminar el único producto del pedido');

            await client.query(
                `DELETE FROM detalle_ventas WHERE id = $1 AND venta_id = $2`, [detalle_id, venta_id]
            );

            const totales = await client.query(
                `SELECT SUM(subtotal) AS total FROM detalle_ventas WHERE venta_id = $1`, [venta_id]
            );
            const total    = Number.parseFloat(totales.rows[0].total);
            const subtotal = Number.parseFloat((total / 1.16).toFixed(2));
            const iva      = Number.parseFloat((total - subtotal).toFixed(2));

            await client.query(`
                UPDATE ventas SET subtotal = $1, iva = $2, total = $3,
                total_articulos = (SELECT COUNT(*) FROM detalle_ventas WHERE venta_id = $4),
                fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $4
            `, [subtotal, iva, total, venta_id]);

            await client.query('COMMIT');
            return { deleted: detalle_id };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    getClienteByVenta: async (venta_id: number) => {
        const result = await pool.query(`
            SELECT
                v.cliente_nombre_completo,
                v.cliente_email,
                v.cliente_telefono,
                v.notas_cliente AS direccion_envio,
                c.telefono,
                c.celular,
                c.fecha_nacimiento,
                u.email AS usuario_email
            FROM ventas v
            JOIN clientes c ON v.cliente_id = c.id
            JOIN usuarios u ON c.user_id = u.id
            WHERE v.id = $1
        `, [venta_id]);
        return result.rows[0];
    },

    confirmarPago: async (payment_id: string, venta_id: number) => {
        // ✅ Verificar si ya fue procesado para evitar duplicados
        const yaExiste = await pool.query(`
            SELECT id FROM transacciones_pago 
            WHERE transaction_id = $1
        `, [payment_id]);

        if (yaExiste.rows.length > 0) {
            console.log(`⚠️ Pago ${payment_id} ya procesado, ignorando duplicado`);
            return yaExiste.rows[0];
        }

        const result = await pool.query(`
            UPDATE transacciones_pago
            SET estado = 'aprobado',
                transaction_id = $1,
                fecha_aprobacion = CURRENT_TIMESTAMP,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE venta_id = $2
            AND estado = 'pendiente'
            RETURNING venta_id
        `, [payment_id, venta_id]);

        if (result.rows.length > 0) {
            await pool.query(`
                UPDATE ventas
                SET estado = 'confirmado',
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [venta_id]);
            console.log(`✅ BD actualizada: transaccion aprobada, venta ${venta_id} → confirmado`);
        } else {
            console.warn(`⚠️ No se encontró transacción pendiente para venta_id=${venta_id}`);
        }

        return result.rows[0];
    }
};