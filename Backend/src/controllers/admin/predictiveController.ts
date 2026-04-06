// Backend/src/controllers/admin/predictiveController.ts
import { Request, Response } from 'express';
import pool from '../../config/database';

// ============================================================
// 📐 MODELO MATEMÁTICO — Ley de Crecimiento
// dQ/dt = k·Q(t)  →  Q(t) = Q0·e^(kt)
// Stock necesario en T meses = (Q0/k)·(e^(kT) - 1)
// k = ln(Q_T / Q0) / T
// ============================================================

const calcularK = (q0: number, qT: number, T: number): number => {
  if (q0 <= 0 || qT <= 0 || T <= 0) return 0;
  return Math.log(qT / q0) / T;
};

const demandaProyectada = (q0: number, k: number, t: number): number => {
  return q0 * Math.exp(k * t);
};

const stockNecesario = (q0: number, k: number, T: number): number => {
  if (k === 0) return q0 * T;
  return (q0 / k) * (Math.exp(k * T) - 1);
};

// ============================================================
// GET /api/prediccion/categorias?anio=2024
// ============================================================
export const getCategorias = async (req: Request, res: Response) => {
  try {
    const { anio = new Date().getFullYear() - 1 } = req.query;

    const query = `
      SELECT 
        c.id                          AS categoria_id,
        c.nombre                      AS categoria,
        COALESCE(SUM(dv.cantidad), 0) AS total_unidades
      FROM catalogo.categorias c
      LEFT JOIN catalogo.productos p    ON p.categoria_id = c.id AND p.activo = true
      LEFT JOIN ventas.detalle_ventas dv ON dv.producto_id = p.id
      LEFT JOIN ventas.ventas v       ON v.id = dv.venta_id
                               AND EXTRACT(YEAR FROM v.fecha_creacion) = $1
                               AND v.estado != 'cancelado'
      WHERE c.activo = true
      GROUP BY c.id, c.nombre
      ORDER BY total_unidades DESC
    `;

    const result = await pool.query(query, [anio]);

    const categorias = result.rows.map((row: any) => ({
      categoria_id: row.categoria_id,
      categoria: row.categoria,
      total_unidades: parseInt(row.total_unidades),
    }));

    const categoriaEstrella = categorias.length > 0 ? categorias[0] : null;

    return res.json({
      success: true,
      data: { anio, categorias, categoria_estrella: categoriaEstrella },
    });
  } catch (error) {
    console.error('❌ Error en getCategorias:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener categorías' });
  }
};

// ============================================================
// GET /api/prediccion/producto-estrella/:categoriaId?anio=2024
// ============================================================
export const getProductoEstrella = async (req: Request, res: Response) => {
  try {
    const { categoriaId } = req.params;
    const { anio = new Date().getFullYear() - 1 } = req.query;

    const query = `
      SELECT 
        p.id                          AS producto_id,
        p.nombre                      AS producto,
        p.stock_actual,
        COALESCE(SUM(dv.cantidad), 0) AS total_unidades,
        ROUND(
          COALESCE(SUM(dv.cantidad), 0)::numeric /
          NULLIF((
            SELECT SUM(dv2.cantidad)
            FROM ventas.detalle_ventas dv2
            JOIN catalogo.productos p2 ON p2.id = dv2.producto_id
            JOIN ventas.ventas v2    ON v2.id = dv2.venta_id
            WHERE p2.categoria_id = $1
              AND EXTRACT(YEAR FROM v2.fecha_creacion) = $2
              AND v2.estado != 'cancelado'
          ), 0) * 100, 1
        ) AS participacion_pct
      FROM catalogo.productos p
      LEFT JOIN ventas.detalle_ventas dv ON dv.producto_id = p.id
      LEFT JOIN ventas.ventas v          ON v.id = dv.venta_id
                                 AND EXTRACT(YEAR FROM v.fecha_creacion) = $2
                                 AND v.estado != 'cancelado'
      WHERE p.categoria_id = $1 AND p.activo = true
      GROUP BY p.id, p.nombre, p.stock_actual
      ORDER BY total_unidades DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [categoriaId, anio]);

    if (result.rows.length === 0) {
      return res.json({ success: true, data: { productos: [], producto_estrella: null } });
    }

    const productos = result.rows.map((row: any) => ({
      producto_id: row.producto_id,
      producto: row.producto,
      stock_actual: parseInt(row.stock_actual ?? 0),
      total_unidades: parseInt(row.total_unidades),
      participacion_pct: parseFloat(row.participacion_pct ?? 0),
    }));

    return res.json({
      success: true,
      data: { productos, producto_estrella: productos[0] },
    });
  } catch (error) {
    console.error('❌ Error en getProductoEstrella:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener producto estrella' });
  }
};

// ============================================================
// GET /api/prediccion/historico/:productoId?anio=2024
// ============================================================
export const getHistorico = async (req: Request, res: Response) => {
  try {
    const { productoId } = req.params;
    const { anio = new Date().getFullYear() - 1 } = req.query;

    const query = `
      SELECT 
        mes_serie.mes                          AS mes,
        COALESCE(SUM(dv.cantidad), 0)          AS unidades
      FROM generate_series(1, 12) AS mes_serie(mes)
      LEFT JOIN ventas.ventas v ON EXTRACT(MONTH FROM v.fecha_creacion) = mes_serie.mes
                        AND EXTRACT(YEAR  FROM v.fecha_creacion) = $2
                        AND v.estado != 'cancelado'
      LEFT JOIN ventas.detalle_ventas dv ON dv.venta_id = v.id 
                                 AND dv.producto_id = $1
      GROUP BY mes_serie.mes
      ORDER BY mes_serie.mes
    `;

    const result = await pool.query(query, [productoId, anio]);

    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const historico = result.rows.map((row: any, idx: number) => ({
      t: idx,
      mes: MESES[parseInt(row.mes) - 1],
      mes_num: parseInt(row.mes),
      unidades: parseInt(row.unidades),
    }));

    // Estadísticas descriptivas
    const unidades = historico.map((h: any) => h.unidades).filter((u: number) => u > 0);
    const suma = unidades.reduce((a: number, b: number) => a + b, 0);
    const promedio = unidades.length > 0 ? suma / unidades.length : 0;

    // Q0 = primer mes con ventas, QT = último mes del histórico
    const q0 = unidades.length > 0 ? unidades[0] : 1;
    const qT = unidades.length > 0 ? unidades[unidades.length - 1] : 1;
    const T = unidades.length > 1 ? unidades.length - 1 : 11;
    const k = calcularK(q0, qT > 0 ? qT : q0, T);

    // Moda
    const freq: Record<number, number> = {};
    unidades.forEach((u: number) => { freq[u] = (freq[u] || 0) + 1; });
    const moda = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? promedio;

    return res.json({
      success: true,
      data: {
        anio,
        historico,
        estadisticas: {
          total_anual: suma,
          promedio_mensual: Math.round(promedio * 10) / 10,
          moda_mensual: parseInt(moda as string),
          min: unidades.length > 0 ? Math.min(...unidades) : 0,
          max: unidades.length > 0 ? Math.max(...unidades) : 0,
          q0,
          qT,
          k: Math.round(k * 10000) / 10000,
          k_pct: Math.round(k * 1000) / 10,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error en getHistorico:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener histórico' });
  }
};

// ============================================================
// POST /api/prediccion/proyeccion
// ============================================================
export const getProyeccion = async (req: Request, res: Response) => {
  try {
    const {
      productoId,
      q0,
      qT,
      T_historico = 11,
      stock_actual,
      lead_time_dias = 7,
      meses_proyeccion = 6,
    } = req.body;

    if (!q0 || !qT || stock_actual === undefined) {
      return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos' });
    }

    const k = calcularK(Number(q0), Number(qT), Number(T_historico));

    const MESES_NOMBRES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const ahora = new Date();
    const proyeccion: any[] = [];
    let stockRestante = parseFloat(stock_actual);
    let mesAgotamiento: number | null = null;
    let stockAcumulado = 0;

    for (let t = 1; t <= meses_proyeccion; t++) {
      const demanda = Math.round(demandaProyectada(Number(qT), k, t));
      stockAcumulado += demanda;
      stockRestante -= demanda;

      const fechaMes = new Date(ahora.getFullYear(), ahora.getMonth() + t, 1);
      const nombreMes = `${MESES_NOMBRES[fechaMes.getMonth()]} ${fechaMes.getFullYear()}`;

      if (stockRestante <= 0 && mesAgotamiento === null) {
        mesAgotamiento = t;
      }

      proyeccion.push({
        t,
        mes: nombreMes,
        demanda_proyectada: demanda,
        stock_acumulado_necesario: stockAcumulado,
        stock_restante: Math.round(stockRestante),
      });
    }

    const stockNec = Math.round(stockNecesario(Number(qT), k, Number(meses_proyeccion)));
    const deficit = Math.max(stockNec - parseFloat(stock_actual), 0);

    let fechaAgotamiento = null;
    let fechaLimitePedido = null;
    if (mesAgotamiento !== null) {
      const fa = new Date(ahora.getFullYear(), ahora.getMonth() + mesAgotamiento, 1);
      fechaAgotamiento = fa.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
      const flp = new Date(fa.getTime() - Number(lead_time_dias) * 24 * 60 * 60 * 1000);
      fechaLimitePedido = flp.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    let semaforo: 'verde' | 'amarillo' | 'rojo' = 'verde';
    if (mesAgotamiento !== null && mesAgotamiento <= 1) semaforo = 'rojo';
    else if (mesAgotamiento !== null && mesAgotamiento <= 2) semaforo = 'amarillo';
    else if (mesAgotamiento !== null) semaforo = 'amarillo';

    return res.json({
      success: true,
      data: {
        parametros: {
          q0, qT, k,
          k_pct: Math.round(k * 1000) / 10,
          T_historico, lead_time_dias, meses_proyeccion,
        },
        proyeccion,
        resumen: {
          stock_actual: parseFloat(stock_actual),
          stock_necesario_semestre: stockNec,
          deficit_proyectado: deficit,
          fecha_agotamiento: fechaAgotamiento,
          fecha_limite_pedido: fechaLimitePedido,
          semaforo,
          meses_hasta_agotamiento: mesAgotamiento,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error en getProyeccion:', error);
    return res.status(500).json({ success: false, message: 'Error al calcular proyección' });
  }
};