// Backend/src/controllers/apartado/apartadoController.ts
import { Request, Response } from 'express';
import { pool } from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';
import axios from 'axios';

// ─── Notificación por email de estado de apartado (reemplaza el banner in-app) ──
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const REMITENTE_EMAIL = process.env.BREVO_SENDER_EMAIL || '';
const REMITENTE_NOMBRE = process.env.BREVO_SENDER_NOMBRE || 'Joyeria Diana Laura';

type TipoNotifApartado = 'activo' | 'liquidado' | 'cancelado' | 'advertencia';

const APARTADO_NOTIF_META: Record<TipoNotifApartado, { color: string; colorClaro: string; icono: string; titulo: string; mensaje: string }> = {
    activo:      { color: '#d4607e', colorClaro: '#f4c2d1', icono: '✅', titulo: 'Apartado confirmado', mensaje: 'Tu pago inicial fue confirmado y tu apartado ya está activo.' },
    liquidado:   { color: '#4c9a5b', colorClaro: '#b8e6c2', icono: '🎁', titulo: '¡Apartado liquidado!', mensaje: 'Terminaste de pagar tu apartado. Ya puedes recoger tu pedido.' },
    cancelado:   { color: '#8a2b2b', colorClaro: '#e6a8a8', icono: '✖️', titulo: 'Apartado cancelado', mensaje: 'Tu apartado fue cancelado.' },
    advertencia: { color: '#c9a84c', colorClaro: '#e6d9a8', icono: '⚠️', titulo: 'Tu apartado está por vencer', mensaje: 'Realiza tu siguiente abono pronto para no perder tu apartado.' },
};

const construirHtmlNotificacionApartado = (apartado: any, tipo: TipoNotifApartado): string => {
    const meta = APARTADO_NOTIF_META[tipo];
    const nombrePila = (apartado.cliente_nombre || '').split(' ')[0];

    const montoTotal    = Number(apartado.monto_total) || 0;
    const montoPagado   = Number(apartado.monto_pagado) || 0;
    const saldo         = Number(apartado.saldo_pendiente) || 0;
    const porcentaje    = montoTotal > 0 ? Math.min(100, Math.round((montoPagado / montoTotal) * 100)) : 0;

    return `
    <div style="background:#050505; padding:40px 16px; font-family:Georgia,'Times New Roman',serif;">
      <table role="presentation" width="100%" style="max-width:560px; margin:0 auto; background:linear-gradient(160deg,#161116 0%,#0b0708 55%,#050405 100%); border-radius:24px; overflow:hidden; border:1px solid ${meta.color}40; box-shadow:0 24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04);">
        <tr><td style="height:6px; background:linear-gradient(90deg,#c9a84c,${meta.color},${meta.colorClaro},${meta.color},#c9a84c); background-size:200% 100%;"></td></tr>

        <tr>
          <td style="padding:48px 36px 30px; text-align:center; background:radial-gradient(circle at 50% -10%, ${meta.color}22 0%, transparent 60%);">
            <p style="margin:0 0 10px; font-size:11px; letter-spacing:6px; text-transform:uppercase; color:${meta.colorClaro}; font-family:Georgia,serif;">Joyería</p>
            <h1 style="margin:0 0 22px; font-family:'Playfair Display',Georgia,serif; font-weight:700; font-style:italic; font-size:36px; color:#ffffff; text-shadow:0 2px 12px rgba(0,0,0,0.4);">Diana Laura</h1>
            <div style="display:inline-block; background:linear-gradient(135deg,${meta.color}2b,${meta.color}10); border:1px solid ${meta.color}80; border-radius:50px; padding:11px 26px; box-shadow:0 6px 18px ${meta.color}25;">
              <span style="font-size:16px; vertical-align:middle;">${meta.icono}</span>
              <span style="font-size:12px; letter-spacing:2.5px; text-transform:uppercase; color:${meta.colorClaro}; font-weight:700; vertical-align:middle; margin-left:9px; font-family:'Segoe UI',Arial,sans-serif;">${meta.titulo}</span>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:6px 36px 8px;">
            <p style="margin:0 0 8px; font-size:24px; color:#ffffff; font-family:'Playfair Display',Georgia,serif; font-style:italic;">Hola, ${nombrePila} 👋</p>
            <p style="margin:0 0 26px; font-size:15px; line-height:1.6; color:rgba(255,255,255,0.65); font-family:'Segoe UI',Arial,sans-serif;">${meta.mensaje}</p>

            <table role="presentation" width="100%" style="background:linear-gradient(160deg,${meta.color}1a 0%, rgba(255,255,255,0.02) 100%); border:1px solid ${meta.color}4a; border-radius:16px; margin:0 0 22px;">
              <tr><td style="padding:24px 26px;">
                <table role="presentation" width="100%">
                  <tr>
                    <td>
                      <p style="margin:0 0 3px; font-size:10.5px; letter-spacing:1.5px; text-transform:uppercase; color:${meta.colorClaro}; font-family:'Segoe UI',Arial,sans-serif;">Folio de apartado</p>
                      <p style="margin:0; font-size:18px; color:#fff; font-weight:700; font-family:'Segoe UI',Arial,sans-serif; letter-spacing:0.3px;">${apartado.folio}</p>
                    </td>
                  </tr>
                </table>

                <div style="height:1px; background:${meta.color}30; margin:18px 0;"></div>

                <table role="presentation" width="100%" style="margin-bottom:14px;">
                  <tr>
                    <td style="font-size:13px; color:rgba(255,255,255,0.55); font-family:'Segoe UI',Arial,sans-serif; padding-bottom:6px;">Total del apartado</td>
                    <td style="font-size:13px; color:#fff; text-align:right; font-family:'Segoe UI',Arial,sans-serif; padding-bottom:6px;">$${montoTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px; color:rgba(255,255,255,0.55); font-family:'Segoe UI',Arial,sans-serif; padding-bottom:6px;">Monto pagado</td>
                    <td style="font-size:13px; color:#a8e6b8; font-weight:700; text-align:right; font-family:'Segoe UI',Arial,sans-serif; padding-bottom:6px;">$${montoPagado.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px; color:rgba(255,255,255,0.55); font-family:'Segoe UI',Arial,sans-serif;">Saldo pendiente</td>
                    <td style="font-size:14px; color:${meta.colorClaro}; font-weight:800; text-align:right; font-family:'Segoe UI',Arial,sans-serif;">$${saldo.toFixed(2)}</td>
                  </tr>
                </table>

                <div style="background:rgba(255,255,255,0.08); border-radius:50px; height:10px; overflow:hidden; margin-bottom:6px;">
                  <div style="height:100%; width:${porcentaje}%; background:linear-gradient(90deg,${meta.color},${meta.colorClaro}); border-radius:50px;"></div>
                </div>
                <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.45); text-align:right; font-family:'Segoe UI',Arial,sans-serif;">${porcentaje}% completado</p>
              </td></tr>
            </table>

            <div style="text-align:center; margin:0 0 8px;">
              <a href="https://joyeria-diana-laura.vercel.app/mis-apartados" style="display:inline-block; background:linear-gradient(135deg,${meta.color} 0%,${meta.colorClaro} 100%); color:#1a0a10; text-decoration:none; font-weight:700; font-size:12.5px; letter-spacing:1.5px; padding:15px 40px; border-radius:50px; box-shadow:0 10px 26px ${meta.color}45; font-family:'Segoe UI',Arial,sans-serif; text-transform:uppercase;">Ver mi apartado</a>
            </div>
          </td>
        </tr>

        <tr><td style="padding:20px 36px 0;"><div style="height:1px; background:linear-gradient(90deg,transparent,${meta.color}45,transparent);"></div></td></tr>
        <tr>
          <td style="padding:22px 36px 36px; text-align:center;">
            <p style="margin:0 0 5px; font-size:16px; color:${meta.colorClaro}; font-weight:700; font-style:italic; font-family:'Playfair Display',Georgia,serif;">Joyería Diana Laura</p>
            <p style="margin:0 0 12px; font-size:11px; letter-spacing:0.5px; color:rgba(255,255,255,0.35); font-family:'Segoe UI',Arial,sans-serif;">✨ Elegancia que brilla contigo ✨</p>
            <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.3); font-family:'Segoe UI',Arial,sans-serif;">📩 Mantente atento a tu correo: aquí te avisaremos de cualquier novedad de tu apartado.</p>
          </td>
        </tr>
      </table>
    </div>`;
};

const enviarEmailApartado = async (apartadoId: number, tipo: TipoNotifApartado): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT a.*, c.nombre || ' ' || COALESCE(c.apellido, '') AS cliente_nombre, c.email AS cliente_email
             FROM apartados a JOIN clientes c ON c.id = a.cliente_id WHERE a.id = $1`,
            [apartadoId]
        );
        const apartado = result.rows[0];
        if (!apartado?.cliente_email) return;

        await axios.post(
            BREVO_ENDPOINT,
            {
                sender: { name: REMITENTE_NOMBRE, email: REMITENTE_EMAIL },
                to: [{ email: apartado.cliente_email, name: apartado.cliente_nombre || '' }],
                subject: `${APARTADO_NOTIF_META[tipo].titulo} — Apartado ${apartado.folio}`,
                htmlContent: construirHtmlNotificacionApartado(apartado, tipo),
            },
            {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        );
    } catch (err: any) {
        console.error('⚠️ Error enviando notificación de apartado:', err.response?.data || err.message);
    }
};

// ─── Utilidad: fecha local México + N días ────────────────────
const fechaMexMasDias = (dias: number): string => {
    const hoyMex = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
    const [y, m, d] = hoyMex.split('-').map(Number);
    const r = new Date(Date.UTC(y, m - 1, d + dias));
    return r.toISOString().split('T')[0];
};

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

        // Recalcular fechas_abono y auto-calcular fecha_limite_siguiente si no se proveyó
        let nuevasFechas = apartado.fechas_abono;
        let fechaSiguienteCalculada = fecha_limite_siguiente || null;

        if (apartado.plan_abono_id && parseFloat(apartado.saldo_pendiente) > 0) {
            const planRes = await client.query(
                `SELECT * FROM planes_abono WHERE id = $1`, [apartado.plan_abono_id]
            );
            if (planRes.rows.length > 0) {
                const plan = planRes.rows[0];
                nuevasFechas = JSON.stringify(calcularFechasAbono(
                    new Date(apartado.fecha_creacion),
                    parseFloat(apartado.saldo_pendiente),
                    plan,
                    parseFloat(apartado.monto_total)
                ));
                // Si el worker no definió fecha_limite_siguiente, calcularla desde hoy + intervalo
                if (!fechaSiguienteCalculada) {
                    fechaSiguienteCalculada = fechaMexMasDias(parseInt(plan.intervalo_dias));
                }
            }
        }

        // Actualizar abono con fecha_limite_siguiente calculada
        if (fechaSiguienteCalculada) {
            await client.query(
                `UPDATE abonos SET fecha_limite_siguiente = $1 WHERE apartado_id = $2 AND estado = 'pagado'`,
                [fechaSiguienteCalculada, id]
            );
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
        enviarEmailApartado(Number.parseInt(id), 'activo');
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
        console.log('getMisApartados userId:', req.user?.id, req.user?.userId); // 🔧 temporal

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
                        'fecha_abono', (ab.fecha_abono AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date,
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
                 WHERE dv.venta_id = a.venta_id) AS productos,
                (SELECT json_build_object(
                    'id', ab2.id, 'monto', ab2.monto, 'monto_antes', ab2.monto_antes,
                    'fecha_creacion', ab2.fecha_creacion, 'comprobante_url', ab2.comprobante_url,
                    'metodo_nombre', mp2.nombre, 'metodo_codigo', mp2.codigo
                ) FROM abonos ab2
                 JOIN metodos_pago mp2 ON mp2.id = ab2.metodo_pago_id
                 WHERE ab2.apartado_id = a.id AND ab2.estado = 'pendiente' LIMIT 1) AS abono_pendiente
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
                        'fecha_abono', (ab.fecha_abono AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date,
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
                        'fecha_abono', (ab.fecha_abono AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date,
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
                 WHERE dv.venta_id = a.venta_id) AS productos,
                (SELECT json_build_object(
                    'id', ab3.id, 'monto', ab3.monto, 'monto_antes', ab3.monto_antes,
                    'fecha_creacion', ab3.fecha_creacion, 'comprobante_url', ab3.comprobante_url,
                    'metodo_nombre', mp3.nombre, 'metodo_codigo', mp3.codigo
                ) FROM abonos ab3
                 JOIN metodos_pago mp3 ON mp3.id = ab3.metodo_pago_id
                 WHERE ab3.apartado_id = a.id AND ab3.estado = 'pendiente' LIMIT 1) AS abono_pendiente
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
        const { monto, metodo_pago_id, fecha_limite_siguiente, fecha_limite_liquidacion, notas, confirmar_liquidacion } = req.body;

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

        // Solo efectivo puede registrarse directamente por el trabajador
        // Transferencia: el cliente sube comprobante y el trabajador usa confirmarAbonoPendiente
        // MP/PayPal: se confirman automáticamente vía webhook
        const metodoCheckRes = await client.query('SELECT codigo, nombre FROM metodos_pago WHERE id = $1', [metodo_pago_id]);
        if (metodoCheckRes.rows.length > 0 && metodoCheckRes.rows[0].codigo !== 'efectivo') {
            return res.status(400).json({
                success: false,
                message: metodoCheckRes.rows[0].codigo === 'transferencia'
                    ? 'Para transferencia el cliente debe subir su comprobante desde la app. El trabajador lo confirma desde "Confirmar abono pendiente".'
                    : `Los pagos con ${metodoCheckRes.rows[0].nombre} se confirman automáticamente cuando el cliente paga en línea.`
            });
        }

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

        // Bloquear liquidación accidental: exigir confirmación explícita
        if (liquidado && !confirmar_liquidacion)
            return res.status(400).json({
                success: false,
                message: 'Este abono liquidaría el apartado completo. Confirma explícitamente que el cliente ya realizó el pago total.',
                requiere_confirmacion_liquidacion: true
            });

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
        enviarEmailApartado(Number.parseInt(id), 'cancelado');
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
        enviarEmailApartado(Number.parseInt(id), 'advertencia');
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
            if (pago.status === 'approved') {
                if (pago.external_reference?.startsWith('APT-')) {
                    const apartado_id = parseInt(pago.external_reference.replace('APT-', ''));
                    await confirmarApartadoPorPago(apartado_id, String(pago.id), 'mercadopago');
                } else if (pago.external_reference?.startsWith('SABONO-')) {
                    const abono_id = parseInt(pago.external_reference.replace('SABONO-', ''));
                    await confirmarAbonoPorPago(abono_id, String(pago.id), 'mercadopago');
                }
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

// ─── CLIENTE: Solicitar abono siguiente ───────────────────────
export const solicitarAbono = async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;
        const { metodo_pago_id, monto, notas } = req.body;

        const clienteRes = await client.query('SELECT id FROM clientes WHERE user_id = $1', [userId]);
        if (clienteRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
        const cliente_id = clienteRes.rows[0].id;

        const apartadoRes = await client.query(
            `SELECT * FROM apartados WHERE id = $1 AND cliente_id = $2 AND estado = 'activo'`,
            [id, cliente_id]
        );
        if (apartadoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado o no está activo.' });
        const apartado = apartadoRes.rows[0];

        const pendienteRes = await client.query(
            `SELECT id FROM abonos WHERE apartado_id = $1 AND estado = 'pendiente'`, [id]
        );
        if (pendienteRes.rows.length > 0)
            return res.status(400).json({ success: false, message: 'Ya tienes un abono pendiente de confirmación. Espera a que el trabajador lo procese.' });

        if (!monto || !metodo_pago_id)
            return res.status(400).json({ success: false, message: 'Monto y método de pago son requeridos.' });

        const monto_abono = parseFloat(monto);
        const monto_antes = parseFloat(apartado.saldo_pendiente);
        if (monto_abono <= 0 || monto_abono > monto_antes)
            return res.status(400).json({ success: false, message: `Monto inválido. Máximo: $${monto_antes.toFixed(2)}` });

        const metodoRes = await client.query('SELECT * FROM metodos_pago WHERE id = $1', [metodo_pago_id]);
        if (metodoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Método de pago no encontrado.' });
        const metodo = metodoRes.rows[0];
        const monto_despues = Math.round((monto_antes - monto_abono) * 100) / 100;

        if (metodo.codigo === 'transferencia' && !req.file)
            return res.status(400).json({ success: false, message: 'Debes subir el comprobante de transferencia.' });

        let comprobante_url: string | null = null;
        if (req.file) {
            const cloudinary = require('../../config/cloudinary').default;
            const uploadResult = await new Promise<any>((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'joyeria-diana-laura/comprobantes-abonos', resource_type: 'image' },
                    (error: any, result: any) => { if (error) reject(error); else resolve(result); }
                );
                stream.end(req.file!.buffer);
            });
            comprobante_url = uploadResult.secure_url;
        }

        const abonoRes = await client.query(
            `INSERT INTO abonos (apartado_id, metodo_pago_id, monto, monto_antes, monto_despues, estado, registrado_por, notas, comprobante_url)
             VALUES ($1,$2,$3,$4,$5,'pendiente',$6,$7,$8) RETURNING id`,
            [id, metodo_pago_id, monto_abono, monto_antes, monto_despues, userId,
             notas || `Abono solicitado — pendiente de confirmación`, comprobante_url]
        );

        await client.query('COMMIT');

        const requiere_pago_externo = ['mercadopago', 'paypal'].includes(metodo.codigo);
        res.status(201).json({
            success: true,
            message: requiere_pago_externo
                ? 'Abono registrado. Procede al pago en línea.'
                : 'Abono registrado. El trabajador lo confirmará pronto.',
            data: { abono_id: abonoRes.rows[0].id, requiere_pago_externo, metodo: metodo.codigo }
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// ─── TRABAJADOR: Confirmar abono pendiente ────────────────────
export const confirmarAbonoPendiente = async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user?.id || req.user?.userId;
        const { id } = req.params;
        const { notas, fecha_limite_siguiente, confirmar_liquidacion } = req.body;

        const apartadoRes = await client.query(
            `SELECT * FROM apartados WHERE id = $1 AND estado = 'activo'`, [id]
        );
        if (apartadoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Apartado no encontrado o no está activo.' });
        const apartado = apartadoRes.rows[0];

        const abonoRes = await client.query(
            `SELECT ab.*, mp.codigo AS metodo_codigo, mp.nombre AS metodo_nombre
             FROM abonos ab
             JOIN metodos_pago mp ON mp.id = ab.metodo_pago_id
             WHERE ab.apartado_id = $1 AND ab.estado = 'pendiente'
             ORDER BY ab.fecha_creacion ASC LIMIT 1`,
            [id]
        );
        if (abonoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'No hay abono pendiente para este apartado.' });

        const abono       = abonoRes.rows[0];
        const monto_abono = parseFloat(abono.monto);
        const monto_despues = parseFloat(abono.monto_despues);
        const liquidado   = monto_despues === 0;

        if (liquidado && !confirmar_liquidacion)
            return res.status(400).json({
                success: false,
                message: 'Este abono liquidaría el apartado completo. Confirma explícitamente que el cliente pagó el total.',
                requiere_confirmacion_liquidacion: true
            });

        const nuevo_monto_pagado = Math.round((parseFloat(apartado.monto_pagado) + monto_abono) * 100) / 100;

        await client.query(
            `UPDATE abonos SET estado = 'pagado', fecha_limite_siguiente = $1,
             notas = COALESCE($2, notas), registrado_por = $3 WHERE id = $4`,
            [fecha_limite_siguiente || null, notas || null, userId, abono.id]
        );

        let nuevasFechas = apartado.fechas_abono;
        if (nuevasFechas) {
            const fechas = typeof nuevasFechas === 'string' ? JSON.parse(nuevasFechas) : nuevasFechas;
            const primerPendiente = fechas.find((f: any) => !f.pagado);
            if (primerPendiente) primerPendiente.pagado = true;
            nuevasFechas = JSON.stringify(fechas);
        }

        const camposUpdate: string[] = [
            `monto_pagado = $1`, `saldo_pendiente = $2`, `estado = $3`,
            `trabajador_id = $4`, `actualizado_por = $4`, `fechas_abono = $5`,
            `fecha_actualizacion = CURRENT_TIMESTAMP`
        ];
        const valoresUpdate: any[] = [nuevo_monto_pagado, monto_despues, liquidado ? 'liquidado' : 'activo', userId, nuevasFechas];
        let idx = 6;
        if (liquidado) camposUpdate.push(`fecha_liquidacion_real = CURRENT_TIMESTAMP`);
        valoresUpdate.push(id);

        await client.query(
            `UPDATE apartados SET ${camposUpdate.join(', ')} WHERE id = $${idx}`, valoresUpdate
        );

        if (liquidado) {
            const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
            await client.query(
                `UPDATE ventas SET codigo_entrega = $1, estado = 'en_preparacion', actualizado_por = $2 WHERE id = $3`,
                [codigo, userId, apartado.venta_id]
            );
        }

        await client.query('COMMIT');
        if (liquidado) enviarEmailApartado(Number.parseInt(id), 'liquidado');
        res.json({
            success: true,
            message: liquidado
                ? '¡Apartado liquidado! Se generó el código de entrega.'
                : `Abono confirmado. Saldo pendiente: $${monto_despues.toFixed(2)}`,
            data: { liquidado, saldo_pendiente: monto_despues }
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// ─── CLIENTE: MP para abono siguiente ─────────────────────────
export const crearPreferenciaMP_AbonoSig = async (req: AuthRequest, res: Response) => {
    try {
        const usuario = req.user;
        const { abono_id } = req.body;

        const abonoRes = await pool.query(
            `SELECT ab.*, a.folio FROM abonos ab
             JOIN apartados a ON a.id = ab.apartado_id
             JOIN clientes c ON c.id = a.cliente_id
             WHERE ab.id = $1 AND ab.estado = 'pendiente' AND c.user_id = $2`,
            [abono_id, usuario?.id || usuario?.userId]
        );
        if (abonoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Abono no encontrado.' });

        const abono   = abonoRes.rows[0];
        const monto   = parseFloat(abono.monto);
        const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!mpToken) return res.status(503).json({ success: false, message: 'MercadoPago no configurado' });

        const backUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const isLocal = (process.env.BACKEND_URL || '').includes('localhost');

        const body: any = {
            items: [{ id: String(abono.id), title: `Abono ${abono.folio}`, quantity: 1, unit_price: monto, currency_id: 'MXN' }],
            payer: { email: usuario?.email || '' },
            external_reference: `SABONO-${abono.id}`,
            back_urls: {
                success: `${backUrl}/mis-apartados?pago=exitoso&abono=${abono.id}`,
                failure: `${backUrl}/mis-apartados?pago=fallido&abono=${abono.id}`,
                pending: `${backUrl}/mis-apartados?pago=pendiente&abono=${abono.id}`,
            },
            statement_descriptor: 'Joyeria Diana Laura'
        };
        if (!isLocal) body.notification_url = `${process.env.BACKEND_URL}/api/apartados/webhook/mercadopago`;

        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
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

// ─── CLIENTE: PayPal para abono siguiente ─────────────────────
export const crearOrdenPayPal_AbonoSig = async (req: AuthRequest, res: Response) => {
    try {
        const usuario = req.user;
        const { abono_id } = req.body;

        const abonoRes = await pool.query(
            `SELECT ab.*, a.folio FROM abonos ab
             JOIN apartados a ON a.id = ab.apartado_id
             JOIN clientes c ON c.id = a.cliente_id
             WHERE ab.id = $1 AND ab.estado = 'pendiente' AND c.user_id = $2`,
            [abono_id, usuario?.id || usuario?.userId]
        );
        if (abonoRes.rows.length === 0)
            return res.status(404).json({ success: false, message: 'Abono no encontrado.' });

        const abono      = abonoRes.rows[0];
        const monto      = parseFloat(abono.monto).toFixed(2);
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
                purchase_units: [{ reference_id: `SABONO-${abono.id}`, amount: { currency_code: 'MXN', value: monto }, description: `Abono ${abono.folio}` }],
                application_context: {
                    return_url: `${backUrl}/mis-apartados?pago=exitoso&abono=${abono.id}&metodo=paypal`,
                    cancel_url:  `${backUrl}/mis-apartados?pago=fallido&abono=${abono.id}&metodo=paypal`,
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

// ─── CLIENTE: Capturar PayPal abono siguiente ─────────────────
export const capturarPayPal_AbonoSig = async (req: AuthRequest, res: Response) => {
    try {
        const { order_id, abono_id } = req.body;
        const ppClientId = process.env.PAYPAL_CLIENT_ID;
        const ppSecret   = process.env.PAYPAL_CLIENT_SECRET;
        const ppBase     = process.env.PAYPAL_MODE === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

        const tokenRes = await fetch(`${ppBase}/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${ppClientId}:${ppSecret}`).toString('base64')}` },
            body: 'grant_type=client_credentials'
        });
        const { access_token } = await tokenRes.json();
        const captureRes = await fetch(`${ppBase}/v2/checkout/orders/${order_id}/capture`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` }
        });
        const captureData = await captureRes.json();

        if (captureData.status === 'COMPLETED') {
            await confirmarAbonoPorPago(parseInt(abono_id), order_id, 'paypal');
            res.json({ success: true, message: 'Pago PayPal del abono confirmado.' });
        } else {
            res.status(400).json({ success: false, message: 'El pago no fue completado.' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Helper: confirmar abono por pago automático ──────────────
const confirmarAbonoPorPago = async (abono_id: number, transaction_id: string, metodo: string) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const abonoRes = await client.query(
            `SELECT ab.*, a.monto_pagado AS apt_monto_pagado, a.fechas_abono AS apt_fechas_abono,
             a.venta_id AS apt_venta_id, a.plan_abono_id AS apt_plan_id,
             pa.intervalo_dias AS plan_intervalo_dias
             FROM abonos ab
             JOIN apartados a ON a.id = ab.apartado_id
             LEFT JOIN planes_abono pa ON pa.id = a.plan_abono_id
             WHERE ab.id = $1 AND ab.estado = 'pendiente'`,
            [abono_id]
        );
        if (abonoRes.rows.length === 0) { console.log(`⚠️ Abono ${abono_id} ya procesado`); return; }

        const abono            = abonoRes.rows[0];
        const monto_abono      = parseFloat(abono.monto);
        const monto_despues    = parseFloat(abono.monto_despues);
        const liquidado        = monto_despues === 0;
        const intervalo_dias   = abono.plan_intervalo_dias ? parseInt(abono.plan_intervalo_dias) : 30;
        // Si pagó antes o en la fecha límite → siguiente se calcula desde esa fecha límite (no desde hoy)
        // Si pagó tarde → siguiente se calcula desde hoy
        const calcFechaSiguiente = (): string => {
            const hoyMex = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
            if (abono.fecha_limite_siguiente) {
                const limite = abono.fecha_limite_siguiente.substring(0, 10);
                const base = hoyMex <= limite ? limite : hoyMex;
                const [y, m, d] = base.split('-').map(Number);
                return new Date(Date.UTC(y, m - 1, d + intervalo_dias)).toISOString().split('T')[0];
            }
            return fechaMexMasDias(intervalo_dias);
        };
        const fecha_siguiente  = liquidado ? null : calcFechaSiguiente();
        const nuevo_monto_pagado = Math.round((parseFloat(abono.apt_monto_pagado) + monto_abono) * 100) / 100;

        await client.query(
            `UPDATE abonos SET estado = 'pagado', notas = $1, fecha_limite_siguiente = $2 WHERE id = $3`,
            [`Pago confirmado vía ${metodo} — ${transaction_id}`, fecha_siguiente, abono_id]
        );

        let nuevasFechas = abono.apt_fechas_abono;
        if (nuevasFechas) {
            const fechas = typeof nuevasFechas === 'string' ? JSON.parse(nuevasFechas) : nuevasFechas;
            const primerPendiente = fechas.find((f: any) => !f.pagado);
            if (primerPendiente) primerPendiente.pagado = true;
            nuevasFechas = JSON.stringify(fechas);
        }

        const camposUpdate = [
            `monto_pagado = $1`, `saldo_pendiente = $2`, `estado = $3`,
            `fechas_abono = $4`, `fecha_actualizacion = CURRENT_TIMESTAMP`
        ];
        const valoresUpdate: any[] = [nuevo_monto_pagado, monto_despues, liquidado ? 'liquidado' : 'activo', nuevasFechas];
        let idx = 5;
        if (liquidado) camposUpdate.push(`fecha_liquidacion_real = CURRENT_TIMESTAMP`);
        valoresUpdate.push(abono.apartado_id);

        await client.query(
            `UPDATE apartados SET ${camposUpdate.join(', ')} WHERE id = $${idx}`, valoresUpdate
        );

        if (liquidado) {
            const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
            await client.query(
                `UPDATE ventas SET codigo_entrega = $1, estado = 'en_preparacion' WHERE id = $2`,
                [codigo, abono.apt_venta_id]
            );
        }

        await client.query('COMMIT');
        if (liquidado) enviarEmailApartado(abono.apartado_id, 'liquidado');
        console.log(`✅ Abono ${abono_id} confirmado por ${metodo}`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
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

        // Calcular fechas si tiene plan
        let fechas_abono = apartado.fechas_abono;
        let intervalo_dias_plan = 30;
        if (apartado.plan_abono_id && parseFloat(apartado.saldo_pendiente) > 0) {
            const planRes = await client.query(`SELECT * FROM planes_abono WHERE id = $1`, [apartado.plan_abono_id]);
            if (planRes.rows.length > 0) {
                intervalo_dias_plan = parseInt(planRes.rows[0].intervalo_dias) || 30;
                fechas_abono = JSON.stringify(calcularFechasAbono(
                    new Date(apartado.fecha_creacion), parseFloat(apartado.saldo_pendiente), planRes.rows[0], parseFloat(apartado.monto_total)
                ));
            }
        }

        const fechaSiguiente = parseFloat(apartado.saldo_pendiente) > 0
            ? fechaMexMasDias(intervalo_dias_plan)
            : null;

        await client.query(
            `UPDATE abonos SET estado = 'pagado', notas = $1, fecha_limite_siguiente = $2
             WHERE apartado_id = $3 AND estado = 'pendiente'`,
            [`Pago confirmado vía ${metodo} — ${transaction_id}`, fechaSiguiente, apartado_id]
        );

        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + 30);

        const liquidadoInicial = parseFloat(apartado.saldo_pendiente) === 0;
        const estadoNuevo = liquidadoInicial ? 'liquidado' : 'activo';

        await client.query(
            `UPDATE apartados SET estado = $1, fecha_limite_liquidacion = $2, fechas_abono = $3,
             ${liquidadoInicial ? 'fecha_liquidacion_real = CURRENT_TIMESTAMP,' : ''}
             fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $4`,
            [estadoNuevo, fechaLimite, fechas_abono, apartado_id]
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

        if (liquidadoInicial) {
            const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
            await client.query(
                `UPDATE ventas SET estado = 'en_preparacion', codigo_entrega = $1 WHERE id = $2`,
                [codigo, apartado.venta_id]
            );
        } else {
            await client.query(`UPDATE ventas SET estado = 'confirmado' WHERE id = $1`, [apartado.venta_id]);
        }
        await client.query('COMMIT');
        enviarEmailApartado(apartado_id, estadoNuevo as TipoNotifApartado);
        console.log(`✅ Apartado ${apartado_id} confirmado por ${metodo}`);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};