import { pool } from '../config/database';

// Piezas de un pedido que ya no tienen existencias suficientes. Se revisa antes de cobrar: si otra
// clienta pagó la última pieza mientras este pedido esperaba, no se debe cobrar algo que ya no hay
// (antes el stock solo se dejaba en 0 y la pieza quedaba vendida dos veces).
export const piezasSinExistencias = async (ventaId: number): Promise<string[]> => {
  const r = await pool.query(
    `SELECT d.producto_nombre
       FROM detalle_ventas d
       JOIN productos p ON p.id = d.producto_id
      WHERE d.venta_id = $1
      GROUP BY d.producto_id, d.producto_nombre, p.stock_actual
     HAVING p.stock_actual < SUM(d.cantidad)`,
    [ventaId]
  );
  return r.rows.map((x: any) => x.producto_nombre);
};

export const mensajeSinExistencias = (piezas: string[]): string =>
  `Ya no hay existencias de: ${piezas.join(', ')}. Escríbenos para ofrecerte otra pieza o cancelar el pedido.`;
