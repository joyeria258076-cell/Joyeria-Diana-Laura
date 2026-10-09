// Backend/src/services/expiracionPedidosService.ts
// Pasa a "expirado" los pedidos abandonados para que no se queden visibles ni
// se puedan tomar meses después:
//   • pendiente (nadie lo tomó)          → sin movimiento en N días
//   • confirmado pero sin pago aprobado  → sin movimiento en N días
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
  return (r.rowCount ?? 0) + (r2.rowCount ?? 0) + (r3.rowCount ?? 0);
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
