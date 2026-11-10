// Backend/src/services/expiracionPedidosService.ts
// Pasa a "expirado" los pedidos abandonados para que no se queden visibles ni
// se puedan tomar meses después:
//   • pendiente (nadie lo tomó)          → sin movimiento en N días
//   • confirmado pero sin pago aprobado  → sin movimiento en N días
// Además, los apartados activos cuya fecha límite para liquidar ya pasó se marcan como
// "vencido" y sus piezas regresan al inventario.
// N = configuracion.dias_expiracion_pedido (7 por defecto). Los pedidos que
// pertenecen a un apartado se excluyen: tienen su propio flujo de liquidación.
// No se restaura stock porque en esos estados todavía no se había descontado
// (el stock se descuenta al aprobarse el pago).

import { pool } from '../config/database';

const INTERVALO_MS = 30 * 60 * 1000; // cada 30 min
let ultimaEjecucion = 0;
let enCurso: Promise<number> | null = null;

export const expirarPedidosAbandonados = async (): Promise<number> => {
  const cfg = await pool.query(`SELECT valor FROM configuracion WHERE clave = 'dias_expiracion_pedido'`);
  const dias = Math.max(1, Number.parseInt(cfg.rows[0]?.valor ?? '7', 10) || 7);

  const r = await pool.query(
    `UPDATE ventas v
        SET estado = 'expirado',
            fecha_cancelacion = NOW(),
            motivo_cancelacion = COALESCE(v.motivo_cancelacion,
              'Expirado automáticamente: sin movimiento en ' || $1::int || ' días'),
            fecha_actualizacion = NOW()
      WHERE v.estado IN ('pendiente', 'confirmado')
        AND COALESCE(v.fecha_actualizacion, v.fecha_creacion) < NOW() - make_interval(days => $1::int)
        AND NOT EXISTS (SELECT 1 FROM apartados a WHERE a.venta_id = v.id)
        AND NOT EXISTS (SELECT 1 FROM transacciones_pago tp
                         WHERE tp.venta_id = v.id AND tp.estado = 'aprobado')
      RETURNING v.id`,
    [dias]
  );
  if (r.rowCount) console.log(`⏳ ${r.rowCount} pedido(s) pasaron a "expirado" (sin movimiento en ${dias} días)`);

  // Pedidos confirmados cuyo plazo para pagar ya venció. fecha_limite_pago se
  // guarda en hora de la Ciudad de México, por eso se compara con esa hora.
  const r2 = await pool.query(
    `UPDATE ventas v
        SET estado = 'expirado',
            fecha_cancelacion = NOW(),
            motivo_cancelacion = COALESCE(v.motivo_cancelacion, 'Expirado: venció el plazo para pagar'),
            fecha_actualizacion = NOW()
      WHERE v.estado = 'confirmado'
        AND v.fecha_limite_pago IS NOT NULL
        AND v.fecha_limite_pago < (NOW() AT TIME ZONE 'America/Mexico_City')
        AND NOT EXISTS (SELECT 1 FROM apartados a WHERE a.venta_id = v.id)
        AND NOT EXISTS (SELECT 1 FROM transacciones_pago tp
                         WHERE tp.venta_id = v.id AND tp.estado = 'aprobado')
      RETURNING v.id`
  );
  if (r2.rowCount) console.log(`⏳ ${r2.rowCount} pedido(s) expiraron por vencer su plazo de pago`);
  // Apartados que nunca recibieron su pago inicial: se cancelan tras el mismo
  // plazo. No se toca stock porque solo se descuenta al confirmar el pago.
  const r3 = await pool.query(
    `UPDATE apartados
        SET estado = 'cancelado',
            fecha_cancelacion = NOW(),
            motivo_cancelacion = COALESCE(motivo_cancelacion, 'Cancelado automáticamente: no se recibió el pago inicial en ' || $1::int || ' días'),
            fecha_actualizacion = NOW()
      WHERE estado = 'pendiente_pago'
        AND COALESCE(fecha_actualizacion, fecha_creacion) < NOW() - make_interval(days => $1::int)
      RETURNING id`,
    [dias]
  );
  if (r3.rowCount) console.log(`⏳ ${r3.rowCount} apartado(s) sin pago inicial se cancelaron`);

  const vencidos = await vencerApartadosActivos();
  return (r.rowCount ?? 0) + (r2.rowCount ?? 0) + (r3.rowCount ?? 0) + vencidos;
};

// Apartados activos (ya pagaron el anticipo y su pieza se descontó del inventario) cuya fecha límite
// para liquidar pasó hace más de un día. Antes se quedaban "activos" para siempre si nadie los
// cancelaba y la pieza seguía apartada. Se marcan "vencido", la pieza regresa al inventario con su
// movimiento de devolución y el pedido se cancela. El día de gracia evita vencerlos por la diferencia
// de horario entre el servidor (UTC) y la hora de México.
export const vencerApartadosActivos = async (): Promise<number> => {
  const candidatos = await pool.query(
    `SELECT id FROM apartados
      WHERE estado = 'activo'
        AND fecha_limite_liquidacion IS NOT NULL
        AND fecha_limite_liquidacion < (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day'`
  );
  let vencidos = 0;
  for (const { id } of candidatos.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const apt = await client.query(
        `UPDATE apartados
            SET estado = 'vencido',
                motivo_cancelacion = COALESCE(motivo_cancelacion, 'Vencido: pasó la fecha límite para liquidar'),
                fecha_cancelacion = NOW(),
                fecha_actualizacion = NOW()
          WHERE id = $1 AND estado = 'activo'
          RETURNING venta_id, folio`,
        [id]
      );
      if (!apt.rows.length) { await client.query('ROLLBACK'); continue; }
      const { venta_id, folio } = apt.rows[0];

      const piezas = await client.query(
        'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = $1 AND producto_id IS NOT NULL',
        [venta_id]
      );
      for (const item of piezas.rows) {
        const p = await client.query(
          'UPDATE productos SET stock_actual = stock_actual + $1, fecha_actualizacion = NOW() WHERE id = $2 RETURNING stock_actual',
          [item.cantidad, item.producto_id]
        );
        if (!p.rows.length) continue;
        const nuevo = p.rows[0].stock_actual;
        await client.query(
          `INSERT INTO movimientos_inventario
              (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, venta_id, motivo, realizado_por)
           VALUES ($1, 'devolucion', $2, $3, $4, $5, $6, 1)`,
          [item.producto_id, item.cantidad, nuevo - item.cantidad, nuevo, venta_id, `Apartado vencido ${folio}`]
        );
      }
      await client.query(
        `UPDATE ventas SET estado = 'cancelado', fecha_cancelacion = NOW(),
                motivo_cancelacion = COALESCE(motivo_cancelacion, 'Apartado vencido'), fecha_actualizacion = NOW()
          WHERE id = $1`,
        [venta_id]
      );
      await client.query('COMMIT');
      vencidos++;
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`⚠️ No se pudo vencer el apartado ${id}:`, err?.message);
    } finally {
      client.release();
    }
  }
  if (vencidos) console.log(`⏳ ${vencidos} apartado(s) activo(s) vencieron y sus piezas regresaron al inventario`);
  return vencidos;
};

/** Ejecuta la expiración como mucho una vez cada 30 min (seguro llamarla en cada listado). */
export const expirarSiToca = async (): Promise<void> => {
  if (Date.now() - ultimaEjecucion < INTERVALO_MS) return;
  if (!enCurso) {
    ultimaEjecucion = Date.now();
    enCurso = expirarPedidosAbandonados()
      .catch(err => { console.error('⚠️ Error expirando pedidos:', err?.message); return 0; })
      .finally(() => { enCurso = null; });
  }
  await enCurso;
};

/** Arranque del servidor: corre una vez y luego periódicamente. */
export const iniciarExpiracionPedidos = () => {
  expirarSiToca();
  setInterval(() => { ultimaEjecucion = 0; expirarSiToca(); }, INTERVALO_MS).unref?.();
};
