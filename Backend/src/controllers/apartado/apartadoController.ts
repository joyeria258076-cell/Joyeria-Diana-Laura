// Backend/src/controllers/apartado/apartadoController.ts
import { Request, Response } from 'express';
import { pool } from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';

// ─── Utilidad: generar folio ──────────────────────────────────
const generarFolioApartado = (): string => {
    const now  = new Date();
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `APT-${yyyy}${mm}${dd}-${rand}`;
};

// ─── Utilidad: calcular fechas de abono según plan ────────────
const calcularFechasAbono = (
    fechaInicio: Date,
    saldoPendiente: number,
    plan: { intervalo_dias: number; porcentaje_abono: number },
    montoTotal: number
): { numero: number; fecha: string; monto: number; pagado: boolean }[] => {
    const fechas = [];
    let saldo    = saldoPendiente;
    let numero   = 1;
    const montoPorAbono = Math.round(montoTotal * (plan.porcentaje_abono / 100) * 100) / 100;
    const fecha  = new Date(fechaInicio);

    while (saldo > 0) {
        fecha.setDate(fecha.getDate() + plan.intervalo_dias);
        const montoEsteAbono = Math.min(montoPorAbono, saldo);
        fechas.push({
            numero,
            fecha:  fecha.toISOString().split('T')[0],
            monto:  montoEsteAbono,
            pagado: false
        });
        saldo   = Math.round((saldo - montoEsteAbono) * 100) / 100;
        numero++;
        if (numero > 100) break; // safety
    }
    return fechas;
};

// ─── ADMIN: CRUD planes de abono ─────────────────────────────
export const getPlanes = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT * FROM planes_abono ORDER BY intervalo_dias ASC`
        );
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const crearPlan = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { nombre, intervalo_dias, porcentaje_abono, descripcion } = req.body;

        if (!nombre || !intervalo_dias || !porcentaje_abono)
            return res.status(400).json({ success: false, message: 'Faltan campos requeridos.' });

        if (porcentaje_abono <= 0 || porcentaje_abono > 100)
            return res.status(400).json({ success: false, message: 'El porcentaje debe estar entre 1 y 100.' });

        const result = await pool.query(
            `INSERT INTO planes_abono (nombre, intervalo_dias, porcentaje_abono, descripcion, creado_por)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [nombre, intervalo_dias, porcentaje_abono, descripcion || null, userId]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const actualizarPlan = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre, intervalo_dias, porcentaje_abono, descripcion, activo } = req.body;

        const result = await pool.query(
            `UPDATE planes_abono SET
                nombre = COALESCE($1, nombre),
                intervalo_dias = COALESCE($2, intervalo_dias),
                porcentaje_abono = COALESCE($3, porcentaje_abono),
                descripcion = COALESCE($4, descripcion),
                activo = COALESCE($5, activo),
                fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $6 RETURNING *`,
            [nombre, intervalo_dias, porcentaje_abono, descripcion, activo, id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Plan no encontrado.' });

        res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const eliminarPlan = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await pool.query(
            `UPDATE planes_abono SET activo = false WHERE id = $1`, [id]
        );
        res.json({ success: true, message: 'Plan desactivado.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CLIENTE: Crear apartado ──────────────────────────────────
export const crearApartado = async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user?.id || req.user?.userId;
        const { venta_id, monto_abono_inicial, metodo_pago_id, plan_abono_id } = req.body;

        if (!venta_id || !monto_abono_inicial || !metodo_pago_id)
            return res.status(400).json({ success: false, message: 'Faltan campos requeridos.' });

        // Obtener cliente_id
        const clienteRes = await client.query(
            'SELECT id FROM clientes WHERE user_id = $1', [userId]
        );
        if (clienteRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
        const cliente_id = clienteRes.rows[0].id;

        // Verificar venta
        const ventaRes = await client.query(
            `SELECT v.id, v.total, v.estado
             FROM ventas v JOIN clientes c ON c.id = v.cliente_id
             WHERE v.id = $1 AND c.user_id = $2`,
            [venta_id, userId]
        );
        if (ventaRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Venta no encontrada.' });

        const venta       = ventaRes.rows[0];
        if (venta.estado !== 'pendiente')
            return res.status(400).json({ success: false, message: 'Solo se pueden apartar pedidos en estado pendiente.' });

        const monto_total  = parseFloat(venta.total);
        const monto_minimo = Math.ceil(monto_total * 0.5 * 100) / 100;
        const abono        = parseFloat(monto_abono_inicial);

        // ✅ Validar monto: mínimo 50%, máximo total
        if (abono < monto_minimo)
            return res.status(400).json({
                success: false,
                message: `El monto mínimo para apartar es $${monto_minimo.toFixed(2)} (50% del total).`
            });
        if (abono > monto_total)
            return res.status(400).json({
                success: false,
                message: `El monto no puede superar el total del pedido ($${monto_total.toFixed(2)}).`
            });

        const saldo_pendiente = Math.round((monto_total - abono) * 100) / 100;
        const folio           = generarFolioApartado();

        // Verificar apartado existente
        const existeApartado = await client.query(
            `SELECT id FROM apartados WHERE venta_id = $1 AND estado NOT IN ('cancelado')`,
            [venta_id]
        );
        if (existeApartado.rows.length > 0)
            return res.status(400).json({ success: false, message: 'Esta venta ya tiene un apartado.' });

        // Obtener plan si se seleccionó
        let plan = null;
        let fechas_abono = null;
        if (plan_abono_id) {
            const planRes = await client.query(
                `SELECT * FROM planes_abono WHERE id = $1 AND activo = true`, [plan_abono_id]
            );
            if (planRes.rows.length > 0) {
                plan = planRes.rows[0];
                // Calcular fechas solo si hay saldo pendiente
                if (saldo_pendiente > 0) {
                    fechas_abono = calcularFechasAbono(
                        new Date(),
                        saldo_pendiente,
                        plan,
                        monto_total
                    );
                }
            }
        }

        // Fecha límite default — se actualizará cuando trabajador confirme
        const fechaLimiteDefault = new Date();
        fechaLimiteDefault.setDate(fechaLimiteDefault.getDate() + 30);

        const apartadoRes = await client.query(
            `INSERT INTO apartados (
                folio, venta_id, cliente_id,
                monto_total, monto_minimo_inicial, monto_pagado, saldo_pendiente,
                fecha_limite_liquidacion, estado, creado_por,
                plan_abono_id, fechas_abono
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendiente_pago',$9,$10,$11)
            RETURNING *`,
            [
                folio, venta_id, cliente_id,
                monto_total, monto_minimo, abono, saldo_pendiente,
                fechaLimiteDefault, userId,
                plan_abono_id || null,
                fechas_abono ? JSON.stringify(fechas_abono) : null
            ]
        );
        const apartado = apartadoRes.rows[0];

        // Abono inicial como pendiente
        await client.query(
            `INSERT INTO abonos (
                apartado_id, metodo_pago_id, monto,
                monto_antes, monto_despues, estado, registrado_por, notas
            ) VALUES ($1,$2,$3,$4,$5,'pendiente',$6,'Abono inicial — pendiente de confirmación por trabajador')`,
            [apartado.id, metodo_pago_id, abono, monto_total, saldo_pendiente, userId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Apartado solicitado. Procede a realizar el pago inicial.',
            data: { apartado, folio }
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error al crear apartado:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// ─── TRABAJADOR: Confirmar pago inicial ───────────────────────
export const confirmarPagoInicial = async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;
        const { fecha_limite_liquidacion, fecha_limite_siguiente, notas } = req.body;

        if (!fecha_limite_liquidacion)
            return res.status(400).json({ success: false, message: 'La fecha límite de liquidación es requerida.' });

        const apartadoRes = await client.query(
            `SELECT a.*, 
                (SELECT ab.metodo_pago_id FROM abonos ab WHERE ab.apartado_id = a.id ORDER BY ab.fecha_creacion ASC LIMIT 1) AS metodo_inicial_id,
                (SELECT mp.codigo FROM abonos ab JOIN metodos_pago mp ON mp.id = ab.metodo_pago_id WHERE ab.apartado_id = a.id ORDER BY ab.fecha_creacion ASC LIMIT 1) AS metodo_inicial_codigo
             FROM apartados a WHERE a.id = $1 AND a.estado = 'pendiente_pago'`,
            [id]
        );
        if (apartadoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado o ya fue procesado.' });

        const apartado = apartadoRes.rows[0];

        // ✅ Guard: no confirmar si el método es MP o PayPal (se confirman automáticamente)
        if (['mercadopago', 'paypal'].includes(apartado.metodo_inicial_codigo)) {
            return res.status(400).json({
                success: false,
                message: `Este apartado usa ${apartado.metodo_inicial_codigo} — el pago se confirma automáticamente.`
            });
        }

        // Actualizar abono inicial a pagado
        await client.query(
            `UPDATE abonos SET
                estado = 'pagado',
                fecha_limite_siguiente = $1,
                notas = $2,
                registrado_por = $3
             WHERE apartado_id = $4 AND estado = 'pendiente'`,
            [fecha_limite_siguiente || null, notas || 'Pago inicial confirmado por trabajador', userId, id]
        );

        // Recalcular fechas_abono si tiene plan y se definió fecha límite
        let nuevasFechas = apartado.fechas_abono;
        if (apartado.plan_abono_id && apartado.saldo_pendiente > 0) {
            const planRes = await client.query(
                `SELECT * FROM planes_abono WHERE id = $1`, [apartado.plan_abono_id]
            );
            if (planRes.rows.length > 0) {
                nuevasFechas = JSON.stringify(calcularFechasAbono(
                    new Date(),
                    parseFloat(apartado.saldo_pendiente),
                    planRes.rows[0],
                    parseFloat(apartado.monto_total)
                ));
            }
        }

        // Actualizar apartado a activo
        await client.query(
            `UPDATE apartados SET
                estado = 'activo',
                trabajador_id = $1,
                fecha_limite_liquidacion = $2,
                fechas_abono = $3,
                actualizado_por = $1,
                fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [userId, fecha_limite_liquidacion, nuevasFechas, id]
        );

        // Descontar stock
        const detallesRes = await client.query(
            'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1',
            [apartado.venta_id]
        );
        for (const item of detallesRes.rows) {
            await client.query(
                'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2',
                [item.cantidad, item.producto_id]
            );
            await client.query(
                `INSERT INTO movimientos_inventario
                    (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, venta_id, motivo, realizado_por)
                 SELECT $1, 'salida_venta', $2, stock_actual + $2, stock_actual, $3, 'Apartado confirmado ' || $4, $5
                 FROM productos WHERE id = $1`,
                [item.producto_id, item.cantidad, apartado.venta_id, apartado.folio, userId]
            );
        }

        // Cambiar estado venta a confirmado
        await client.query(
            `UPDATE ventas SET estado = 'confirmado', trabajador_id = $1, actualizado_por = $1 WHERE id = $2`,
            [userId, apartado.venta_id]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Pago inicial confirmado. Apartado activo y stock reservado.' });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error al confirmar pago inicial:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// ─── CLIENTE: Mis apartados ───────────────────────────────────
export const getMisApartados = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id || req.user?.userId;

        const result = await pool.query(
            `SELECT a.*,
                v.folio AS venta_folio,
                pa.nombre AS plan_nombre,
                pa.intervalo_dias AS plan_intervalo_dias,
                pa.porcentaje_abono AS plan_porcentaje,
                (SELECT COUNT(*) FROM abonos ab WHERE ab.apartado_id = a.id AND ab.estado = 'pagado') AS total_abonos,
                (SELECT mp.codigo FROM abonos ab
                    JOIN metodos_pago mp ON mp.id = ab.metodo_pago_id
                    WHERE ab.apartado_id = a.id
                    ORDER BY ab.fecha_creacion ASC LIMIT 1) AS metodo_pago_inicial,
                (SELECT json_agg(
                    json_build_object(
                        'id', ab.id, 'monto', ab.monto,
                        'monto_antes', ab.monto_antes, 'monto_despues', ab.monto_despues,
                        'fecha_abono', ab.fecha_abono,
                        'fecha_limite_siguiente', ab.fecha_limite_siguiente,
                        'estado', ab.estado,
                        'notas', ab.notas,
                        'comprobante_url', ab.comprobante_url
                    ) ORDER BY ab.fecha_abono ASC
                ) FROM abonos ab WHERE ab.apartado_id = a.id AND ab.estado = 'pagado') AS abonos,
                (SELECT json_agg(
                    json_build_object('nombre', p.nombre, 'cantidad', dv.cantidad,
                    'precio_unitario', dv.precio_unitario, 'imagen', p.imagen_principal)
                ) FROM detalle_ventas dv
                 JOIN productos p ON p.id = dv.producto_id
                 WHERE dv.venta_id = a.venta_id) AS productos
             FROM apartados a
             JOIN ventas v ON v.id = a.venta_id
             JOIN clientes c ON c.id = a.cliente_id
             LEFT JOIN planes_abono pa ON pa.id = a.plan_abono_id
             WHERE c.user_id = $1
             ORDER BY a.fecha_creacion DESC`,
            [userId]
        );

        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CLIENTE / TRABAJADOR: Detalle ───────────────────────────
export const getApartadoById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const apartadoRes = await pool.query(
            `SELECT a.*,
                v.folio AS venta_folio, v.total AS venta_total,
                u.nombre AS trabajador_nombre,
                pa.nombre AS plan_nombre,
                pa.intervalo_dias AS plan_intervalo_dias,
                pa.porcentaje_abono AS plan_porcentaje,
                (SELECT json_agg(
                    json_build_object(
                        'id', ab.id, 'monto', ab.monto,
                        'monto_antes', ab.monto_antes, 'monto_despues', ab.monto_despues,
                        'fecha_abono', ab.fecha_abono,
                        'fecha_limite_siguiente', ab.fecha_limite_siguiente,
                        'estado', ab.estado,
                        'metodo_pago_id', ab.metodo_pago_id,
                        'comprobante_url', ab.comprobante_url,
                        'notas', ab.notas
                    ) ORDER BY ab.fecha_abono ASC
                ) FROM abonos ab WHERE ab.apartado_id = a.id) AS abonos,
                (SELECT json_agg(
                    json_build_object(
                        'nombre', p.nombre, 'cantidad', dv.cantidad,
                        'precio_unitario', dv.precio_unitario, 'imagen', p.imagen_principal
                    )
                ) FROM detalle_ventas dv
                 JOIN productos p ON p.id = dv.producto_id
                 WHERE dv.venta_id = a.venta_id) AS productos
             FROM apartados a
             JOIN ventas v ON v.id = a.venta_id
             LEFT JOIN usuarios u ON u.id = a.trabajador_id
             LEFT JOIN planes_abono pa ON pa.id = a.plan_abono_id
             WHERE a.id = $1`,
            [id]
        );

        if (apartadoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado.' });

        res.json({ success: true, data: apartadoRes.rows[0] });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── TRABAJADOR: Todos los apartados ─────────────────────────
export const getTodosApartados = async (req: AuthRequest, res: Response) => {
    try {
        const { estado, archivado, busqueda, page } = req.query;
        const params: any[] = [];
        const condiciones: string[] = [];
        let idx = 1;

        const mostrarArchivados = archivado === 'true';
        condiciones.push(`a.archivado = $${idx++}`);
        params.push(mostrarArchivados);

        if (estado && estado !== 'todos') {
            condiciones.push(`a.estado = $${idx++}`);
            params.push(estado);
        }

        if (busqueda && String(busqueda).trim()) {
            condiciones.push(`(
                LOWER(c2.nombre || ' ' || COALESCE(c2.apellido, '')) ILIKE $${idx} OR
                LOWER(a.folio) ILIKE $${idx} OR
                LOWER(c2.email) ILIKE $${idx} OR
                LOWER(COALESCE(c2.telefono, '')) ILIKE $${idx}
            )`);
            params.push(`%${String(busqueda).toLowerCase()}%`);
            idx++;
        }

        const whereClause = `WHERE ${condiciones.join(' AND ')}`;
        const limite  = 20;
        const pagina  = parseInt(String(page || '1')) || 1;
        const offset  = (pagina - 1) * limite;

        const totalRes = await pool.query(
            `SELECT COUNT(*) FROM apartados a JOIN clientes c2 ON c2.id = a.cliente_id ${whereClause}`,
            params
        );
        const total = parseInt(totalRes.rows[0].count);

        const result = await pool.query(
            `SELECT a.*,
                v.folio AS venta_folio,
                c2.nombre || ' ' || COALESCE(c2.apellido, '') AS cliente_nombre,
                c2.email AS cliente_email,
                c2.telefono AS cliente_telefono,
                pa.nombre AS plan_nombre,
                pa.intervalo_dias AS plan_intervalo_dias,
                (SELECT mp.codigo FROM abonos ab
                    JOIN metodos_pago mp ON mp.id = ab.metodo_pago_id
                    WHERE ab.apartado_id = a.id
                    ORDER BY ab.fecha_creacion ASC LIMIT 1) AS metodo_pago_inicial,
                (SELECT mp.nombre FROM abonos ab
                    JOIN metodos_pago mp ON mp.id = ab.metodo_pago_id
                    WHERE ab.apartado_id = a.id
                    ORDER BY ab.fecha_creacion ASC LIMIT 1) AS metodo_pago_inicial_nombre,
                (SELECT COUNT(*) FROM abonos ab WHERE ab.apartado_id = a.id AND ab.estado = 'pagado') AS total_abonos,
                (SELECT json_agg(
                    json_build_object(
                        'id', ab.id,
                        'monto', ab.monto,
                        'monto_antes', ab.monto_antes,
                        'monto_despues', ab.monto_despues,
                        'fecha_abono', ab.fecha_abono,
                        'fecha_limite_siguiente', ab.fecha_limite_siguiente,
                        'estado', ab.estado,
                        'notas', ab.notas,
                        'comprobante_url', ab.comprobante_url,
                        'metodo_nombre', mp2.nombre,
                        'metodo_codigo', mp2.codigo
                    ) ORDER BY ab.fecha_abono ASC
                ) FROM abonos ab
                  LEFT JOIN metodos_pago mp2 ON mp2.id = ab.metodo_pago_id
                  WHERE ab.apartado_id = a.id) AS abonos,
                (SELECT json_agg(p.nombre) FROM detalle_ventas dv
                 JOIN productos p ON p.id = dv.producto_id
                 WHERE dv.venta_id = a.venta_id) AS productos
             FROM apartados a
             JOIN ventas v ON v.id = a.venta_id
             JOIN clientes c2 ON c2.id = a.cliente_id
             LEFT JOIN planes_abono pa ON pa.id = a.plan_abono_id
             ${whereClause}
             ORDER BY
                CASE a.estado
                    WHEN 'pendiente_pago' THEN 1
                    WHEN 'activo'         THEN 2
                    WHEN 'vencido'        THEN 3
                    WHEN 'liquidado'      THEN 4
                    WHEN 'cancelado'      THEN 5
                END,
                a.fecha_creacion DESC
             LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limite, offset]
        );

        res.json({
            success: true,
            data: result.rows,
            meta: { total, pagina, limite, total_paginas: Math.ceil(total / limite) }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── TRABAJADOR: Registrar abono ──────────────────────────────
export const registrarAbono = async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;
        const { monto, metodo_pago_id, fecha_limite_siguiente, fecha_limite_liquidacion, notas } = req.body;

        if (!monto || !metodo_pago_id)
            return res.status(400).json({ success: false, message: 'Monto y método de pago son requeridos.' });

        const apartadoRes = await client.query(
            `SELECT * FROM apartados WHERE id = $1 AND estado = 'activo'`, [id]
        );
        if (apartadoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado o no está activo.' });

        const apartado    = apartadoRes.rows[0];
        const monto_abono = parseFloat(monto);
        const monto_antes = parseFloat(apartado.saldo_pendiente);

        // ✅ Validaciones estrictas de monto
        if (monto_abono <= 0)
            return res.status(400).json({ success: false, message: 'El monto debe ser mayor a $0.' });

        if (monto_abono > monto_antes)
            return res.status(400).json({
                success: false,
                message: `El abono ($${monto_abono.toFixed(2)}) supera el saldo pendiente ($${monto_antes.toFixed(2)}).`
            });

        const monto_despues      = Math.round((monto_antes - monto_abono) * 100) / 100;
        const nuevo_monto_pagado = Math.round((parseFloat(apartado.monto_pagado) + monto_abono) * 100) / 100;
        const liquidado          = monto_despues === 0;

        // Registrar el abono
        await client.query(
            `INSERT INTO abonos (
                apartado_id, metodo_pago_id, monto,
                monto_antes, monto_despues, fecha_limite_siguiente,
                estado, notas, registrado_por
            ) VALUES ($1,$2,$3,$4,$5,$6,'pagado',$7,$8)`,
            [id, metodo_pago_id, monto_abono, monto_antes, monto_despues,
             fecha_limite_siguiente || null, notas || null, userId]
        );

        // Actualizar fechas_abono si tiene plan — marcar el abono correspondiente como pagado
        let nuevasFechas = apartado.fechas_abono;
        if (nuevasFechas) {
            const fechas = typeof nuevasFechas === 'string'
                ? JSON.parse(nuevasFechas)
                : nuevasFechas;
            const primerPendiente = fechas.find((f: any) => !f.pagado);
            if (primerPendiente) primerPendiente.pagado = true;
            nuevasFechas = JSON.stringify(fechas);
        }

        // Campos a actualizar en apartados
        const camposUpdate: string[] = [
            `monto_pagado = $1`,
            `saldo_pendiente = $2`,
            `estado = $3`,
            `trabajador_id = $4`,
            `actualizado_por = $4`,
            `fechas_abono = $5`,
            `fecha_actualizacion = CURRENT_TIMESTAMP`
        ];
        const valoresUpdate: any[] = [
            nuevo_monto_pagado,
            monto_despues,
            liquidado ? 'liquidado' : 'activo',
            userId,
            nuevasFechas
        ];
        let idx = 6;

        if (liquidado) camposUpdate.push(`fecha_liquidacion_real = CURRENT_TIMESTAMP`);
        if (fecha_limite_liquidacion) {
            camposUpdate.push(`fecha_limite_liquidacion = $${idx++}`);
            valoresUpdate.push(fecha_limite_liquidacion);
        }
        valoresUpdate.push(id);

        await client.query(
            `UPDATE apartados SET ${camposUpdate.join(', ')} WHERE id = $${idx}`,
            valoresUpdate
        );

        // Si liquidó: generar código de entrega
        if (liquidado) {
            const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
            await client.query(
                `UPDATE ventas SET codigo_entrega = $1, estado = 'en_preparacion', actualizado_por = $2 WHERE id = $3`,
                [codigo, userId, apartado.venta_id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: liquidado
                ? '¡Apartado liquidado! Se generó el código de entrega.'
                : `Abono registrado correctamente. Saldo pendiente: $${monto_despues.toFixed(2)}`,
            data: { liquidado, saldo_pendiente: monto_despues, monto_pagado: nuevo_monto_pagado }
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error al registrar abono:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// ─── TRABAJADOR: Cancelar apartado ───────────────────────────
export const cancelarApartado = async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;
        const { motivo_cancelacion } = req.body;

        const apartadoRes = await client.query(
            `SELECT * FROM apartados WHERE id = $1 AND estado IN ('pendiente_pago','activo')`, [id]
        );
        if (apartadoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado o ya no está activo.' });

        const apartado = apartadoRes.rows[0];

        await client.query(
            `UPDATE apartados SET
                estado = 'cancelado', motivo_cancelacion = $1,
                cancelado_por = $2, fecha_cancelacion = CURRENT_TIMESTAMP,
                actualizado_por = $2, fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [motivo_cancelacion || 'Cancelado por trabajador', userId, id]
        );

        if (apartado.estado === 'activo') {
            const detallesRes = await client.query(
                'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1',
                [apartado.venta_id]
            );
            for (const item of detallesRes.rows) {
                await client.query(
                    'UPDATE productos SET stock_actual = stock_actual + $1 WHERE id = $2',
                    [item.cantidad, item.producto_id]
                );
                await client.query(
                    `INSERT INTO movimientos_inventario
                        (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, venta_id, motivo, realizado_por)
                     SELECT $1, 'devolucion', $2, stock_actual - $2, stock_actual, $3, 'Cancelación apartado ' || $4, $5
                     FROM productos WHERE id = $1`,
                    [item.producto_id, item.cantidad, apartado.venta_id, apartado.folio, userId]
                );
            }
        }

        await client.query(
            `UPDATE ventas SET estado = 'cancelado', motivo_cancelacion = $1,
             cancelado_por = $2, fecha_cancelacion = CURRENT_TIMESTAMP WHERE id = $3`,
            [motivo_cancelacion || 'Apartado cancelado', userId, apartado.venta_id]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Apartado cancelado correctamente.' });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error al cancelar apartado:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// ─── TRABAJADOR: Marcar advertencia ──────────────────────────
export const marcarAdvertencia = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;

        await pool.query(
            `UPDATE apartados SET advertencia_enviada = true,
             fecha_advertencia = CURRENT_TIMESTAMP, actualizado_por = $1
             WHERE id = $2 AND estado = 'activo'`,
            [userId, id]
        );
        res.json({ success: true, message: 'Advertencia registrada.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── TRABAJADOR: Archivar / desarchivar ──────────────────────
export const archivarApartado = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;
        const { archivar } = req.body;

        const aptRes = await pool.query(`SELECT estado FROM apartados WHERE id = $1`, [id]);
        if (aptRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado.' });

        if (!['liquidado', 'cancelado'].includes(aptRes.rows[0].estado))
            return res.status(400).json({ success: false, message: 'Solo se pueden archivar apartados liquidados o cancelados.' });

        await pool.query(
            `UPDATE apartados SET archivado = $1, actualizado_por = $2,
             fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $3`,
            [archivar !== false, userId, id]
        );
        res.json({ success: true, message: archivar !== false ? 'Apartado archivado.' : 'Apartado desarchivado.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CLIENTE: Crear preferencia MP ───────────────────────────
export const crearPreferenciaMP_Apartado = async (req: AuthRequest, res: Response) => {
    try {
        const usuario = req.user;
        const userId  = usuario?.id || usuario?.userId;
        const { apartado_id } = req.body;

        if (!apartado_id)
            return res.status(400).json({ success: false, message: 'apartado_id requerido' });

        const aptRes = await pool.query(
            `SELECT a.*, v.folio AS venta_folio FROM apartados a
             JOIN ventas v ON v.id = a.venta_id
             JOIN clientes c ON c.id = a.cliente_id
             WHERE a.id = $1 AND a.estado = 'pendiente_pago' AND c.user_id = $2`,
            [apartado_id, userId]
        );
        if (aptRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado o ya procesado.' });

        const apartado = aptRes.rows[0];
        const monto    = parseFloat(apartado.monto_pagado);
        const mpToken  = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!mpToken) return res.status(503).json({ success: false, message: 'MercadoPago no configurado' });

        const backUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const isLocal = (process.env.BACKEND_URL || '').includes('localhost');

        const body: any = {
            items: [{ id: String(apartado.id), title: `Apartado ${apartado.folio}`, quantity: 1, unit_price: monto, currency_id: 'MXN' }],
            payer: { email: usuario?.email || '' },
            external_reference: `APT-${apartado.id}`,
            back_urls: {
                success: `${backUrl}/mis-apartados?pago=exitoso&apartado=${apartado.id}`,
                failure: `${backUrl}/mis-apartados?pago=fallido&apartado=${apartado.id}`,
                pending: `${backUrl}/mis-apartados?pago=pendiente&apartado=${apartado.id}`,
            },
            statement_descriptor: 'Joyeria Diana Laura'
        };
        if (!isLocal) body.notification_url = `${process.env.BACKEND_URL}/api/apartados/webhook/mercadopago`;

        const mpRes  = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mpToken}` },
            body: JSON.stringify(body)
        });
        if (!mpRes.ok) return res.status(502).json({ success: false, message: 'Error al crear preferencia MP' });

        const mpData = await mpRes.json();
        res.json({ success: true, data: { preference_id: mpData.id, init_point: mpData.init_point, sandbox_init_point: mpData.sandbox_init_point } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── WEBHOOK MP ───────────────────────────────────────────────
export const webhookMP_Apartado = async (req: Request, res: Response) => {
    try {
        const { type, data } = req.body;
        if (type === 'payment' && data?.id) {
            const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
            if (!mpToken) return res.sendStatus(503);
            const pagoRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
                headers: { 'Authorization': `Bearer ${mpToken}` }
            });
            const pago = await pagoRes.json();
            if (pago.status === 'approved' && pago.external_reference?.startsWith('APT-')) {
                const apartado_id = parseInt(pago.external_reference.replace('APT-', ''));
                await confirmarApartadoPorPago(apartado_id, String(pago.id), 'mercadopago');
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Error webhook MP apartado:', error);
        res.sendStatus(500);
    }
};

// ─── CLIENTE: Crear orden PayPal ──────────────────────────────
export const crearOrdenPayPal_Apartado = async (req: AuthRequest, res: Response) => {
    try {
        const usuario = req.user;
        const userId  = usuario?.id || usuario?.userId;
        const { apartado_id } = req.body;

        const aptRes = await pool.query(
            `SELECT a.*, v.folio AS venta_folio FROM apartados a
             JOIN ventas v ON v.id = a.venta_id JOIN clientes c ON c.id = a.cliente_id
             WHERE a.id = $1 AND a.estado = 'pendiente_pago' AND c.user_id = $2`,
            [apartado_id, userId]
        );
        if (aptRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado.' });

        const apartado   = aptRes.rows[0];
        const monto      = parseFloat(apartado.monto_pagado).toFixed(2);
        const ppClientId = process.env.PAYPAL_CLIENT_ID;
        const ppSecret   = process.env.PAYPAL_CLIENT_SECRET;
        if (!ppClientId || !ppSecret) return res.status(503).json({ success: false, message: 'PayPal no configurado' });

        const ppBase = process.env.PAYPAL_MODE === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
        const tokenRes = await fetch(`${ppBase}/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${ppClientId}:${ppSecret}`).toString('base64')}` },
            body: 'grant_type=client_credentials'
        });
        const { access_token } = await tokenRes.json();
        const backUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const orderRes = await fetch(`${ppBase}/v2/checkout/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{ reference_id: `APT-${apartado.id}`, amount: { currency_code: 'MXN', value: monto }, description: `Apartado ${apartado.folio}` }],
                application_context: {
                    return_url: `${backUrl}/mis-apartados?pago=exitoso&apartado=${apartado.id}&metodo=paypal`,
                    cancel_url: `${backUrl}/mis-apartados?pago=fallido&apartado=${apartado.id}&metodo=paypal`,
                    brand_name: 'Joyería Diana Laura', locale: 'es-MX', landing_page: 'BILLING', user_action: 'PAY_NOW'
                }
            })
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) return res.status(502).json({ success: false, message: 'Error al crear orden PayPal' });

        const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;
        res.json({ success: true, data: { order_id: orderData.id, approve_url: approveLink } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CLIENTE: Capturar PayPal ─────────────────────────────────
export const capturarPayPal_Apartado = async (req: AuthRequest, res: Response) => {
    try {
        const { order_id, apartado_id } = req.body;
        const ppClientId = process.env.PAYPAL_CLIENT_ID;
        const ppSecret   = process.env.PAYPAL_CLIENT_SECRET;
        const ppBase     = process.env.PAYPAL_MODE === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

        const tokenRes = await fetch(`${ppBase}/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${ppClientId}:${ppSecret}`).toString('base64')}` },
            body: 'grant_type=client_credentials'
        });
        const { access_token } = await tokenRes.json();
        const captureRes  = await fetch(`${ppBase}/v2/checkout/orders/${order_id}/capture`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` }
        });
        const captureData = await captureRes.json();

        if (captureData.status === 'COMPLETED') {
            await confirmarApartadoPorPago(parseInt(apartado_id), order_id, 'paypal');
            res.json({ success: true, message: 'Pago PayPal capturado correctamente.' });
        } else {
            res.status(400).json({ success: false, message: 'El pago no fue completado.' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CLIENTE: Subir comprobante ───────────────────────────────
export const subirComprobanteApartado = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;

        const aptRes = await pool.query(
            `SELECT a.* FROM apartados a JOIN clientes c ON c.id = a.cliente_id
             WHERE a.id = $1 AND c.user_id = $2 AND a.estado = 'pendiente_pago'`,
            [id, userId]
        );
        if (aptRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado.' });
        if (!req.file)
            return res.status(400).json({ success: false, message: 'No se recibió ningún archivo.' });

        const cloudinary = require('../../config/cloudinary').default;
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'joyeria-diana-laura/comprobantes-apartados', public_id: `comprobante-apt-${aptRes.rows[0].folio}-${Date.now()}`, resource_type: 'image' },
                (error: any, result: any) => { if (error) reject(error); else resolve(result); }
            );
            stream.end(req.file!.buffer);
        });

        await pool.query(`UPDATE abonos SET comprobante_url = $1 WHERE apartado_id = $2 AND estado = 'pendiente'`, [uploadResult.secure_url, id]);
        await pool.query(`UPDATE apartados SET comprobante_url = $1 WHERE id = $2`, [uploadResult.secure_url, id]);

        res.json({ success: true, message: 'Comprobante subido. El trabajador lo revisará pronto.', data: { url: uploadResult.secure_url } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Helper: confirmar apartado por pago automático ──────────
const confirmarApartadoPorPago = async (apartado_id: number, transaction_id: string, metodo: string) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const aptRes = await client.query(
            `SELECT * FROM apartados WHERE id = $1 AND estado = 'pendiente_pago'`, [apartado_id]
        );
        if (aptRes.rows.length === 0) { console.log(`⚠️ Apartado ${apartado_id} ya procesado`); return; }
        const apartado = aptRes.rows[0];

        await client.query(
            `UPDATE abonos SET estado = 'pagado', notas = $1 WHERE apartado_id = $2 AND estado = 'pendiente'`,
            [`Pago confirmado vía ${metodo} — ${transaction_id}`, apartado_id]
        );

        // Calcular fechas si tiene plan
        let fechas_abono = apartado.fechas_abono;
        if (apartado.plan_abono_id && parseFloat(apartado.saldo_pendiente) > 0) {
            const planRes = await client.query(`SELECT * FROM planes_abono WHERE id = $1`, [apartado.plan_abono_id]);
            if (planRes.rows.length > 0) {
                fechas_abono = JSON.stringify(calcularFechasAbono(
                    new Date(), parseFloat(apartado.saldo_pendiente), planRes.rows[0], parseFloat(apartado.monto_total)
                ));
            }
        }

        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + 30);

        await client.query(
            `UPDATE apartados SET estado = 'activo', fecha_limite_liquidacion = $1, fechas_abono = $2, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $3`,
            [fechaLimite, fechas_abono, apartado_id]
        );

        const detallesRes = await client.query('SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1', [apartado.venta_id]);
        for (const item of detallesRes.rows) {
            await client.query('UPDATE productos SET stock_actual = stock_actual - $1 WHERE id = $2', [item.cantidad, item.producto_id]);
            await client.query(
                `INSERT INTO movimientos_inventario (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, venta_id, motivo, realizado_por)
                 SELECT $1, 'salida_venta', $2, stock_actual + $2, stock_actual, $3, 'Apartado pago ' || $4, 1 FROM productos WHERE id = $1`,
                [item.producto_id, item.cantidad, apartado.venta_id, metodo]
            );
        }

        await client.query(`UPDATE ventas SET estado = 'confirmado' WHERE id = $1`, [apartado.venta_id]);
        await client.query('COMMIT');
        console.log(`✅ Apartado ${apartado_id} confirmado por ${metodo}`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};