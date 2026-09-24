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
  return r.rowCount ?? 0;
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
