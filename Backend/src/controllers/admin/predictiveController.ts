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
// ⚠️  CONTEXTO CRÍTICO DE LA BD
// Todas las ventas importadas tienen fecha_creacion = 2026-04-11
// El mes/año REAL está en notas_internas: "Venta de contado - {Mes} {YYYY}"
// NUNCA usamos EXTRACT(YEAR FROM v.fecha_creacion).
// Siempre usamos el CTE ventas_con_mes para obtener mes_real y anio_real.
// ============================================================

const CTE_MES_ANIO = `
  WITH ventas_con_mes AS (
    SELECT
      v.id,
      v.estado,
      CASE
        WHEN v.notas_internas LIKE '%Enero%'      THEN 1
        WHEN v.notas_internas LIKE '%Febrero%'    THEN 2
        WHEN v.notas_internas LIKE '%Marzo%'      THEN 3
        WHEN v.notas_internas LIKE '%Abril%'      THEN 4
        WHEN v.notas_internas LIKE '%Mayo%'       THEN 5
        WHEN v.notas_internas LIKE '%Junio%'      THEN 6
        WHEN v.notas_internas LIKE '%Julio%'      THEN 7
        WHEN v.notas_internas LIKE '%Agosto%'     THEN 8
        WHEN v.notas_internas LIKE '%Septiembre%' THEN 9
        WHEN v.notas_internas LIKE '%Octubre%'    THEN 10
        WHEN v.notas_internas LIKE '%Noviembre%'  THEN 11
        WHEN v.notas_internas LIKE '%Diciembre%'  THEN 12
        ELSE NULL
      END AS mes_real,
      CASE
        WHEN v.notas_internas ~ '\\d{4}$'
          THEN CAST(SUBSTRING(v.notas_internas FROM '(\\d{4})$') AS INTEGER)
        ELSE NULL
      END AS anio_real
    FROM ventas v
    WHERE v.estado != 'cancelado'
      AND v.notas_internas LIKE 'Venta de contado%'
  )
`;

// ============================================================
// GET /api/prediccion/anios
// ============================================================
export const getAnios = async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT
        CAST(SUBSTRING(notas_internas FROM '(\\d{4})$') AS INTEGER) AS anio
      FROM ventas
      WHERE notas_internas LIKE 'Venta de contado%'
        AND notas_internas ~ '\\d{4}$'
      ORDER BY anio DESC
    `;
    const result = await pool.query(query);
    const anios = result.rows.map((r: any) => parseInt(r.anio));
    return res.json({ success: true, data: { anios } });
  } catch (error) {
    console.error('❌ Error en getAnios:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener años' });
  }
};

// ============================================================
// GET /api/prediccion/meses-disponibles?anio=2025
// Devuelve los meses que tienen al menos 1 venta en ese año
// ============================================================
export const getMesesDisponibles = async (req: Request, res: Response) => {
  try {
    const { anio = 2025 } = req.query;

    const query = `
      ${CTE_MES_ANIO}
      SELECT DISTINCT v.mes_real AS mes
      FROM ventas_con_mes v
      JOIN detalle_ventas dv ON dv.venta_id = v.id
                             AND dv.cantidad <= 10
      WHERE v.anio_real = $1
        AND v.mes_real IS NOT NULL
      ORDER BY mes
    `;

    const result = await pool.query(query, [anio]);
    const meses = result.rows.map((r: any) => parseInt(r.mes));

    return res.json({ success: true, data: { anio, meses } });
  } catch (error) {
    console.error('❌ Error en getMesesDisponibles:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener meses disponibles' });
  }
};

// ============================================================
// GET /api/prediccion/categorias?anio=2025&mes_inicio=3
// ============================================================
export const getCategorias = async (req: Request, res: Response) => {
  try {
    const { anio = 2025, mes_inicio = 1 } = req.query;

    const query = `
      ${CTE_MES_ANIO}
      SELECT
        c.id                          AS categoria_id,
        c.nombre                      AS categoria,
        COALESCE(SUM(dv.cantidad), 0) AS total_unidades
      FROM categorias c
      LEFT JOIN productos p        ON p.categoria_id = c.id AND p.activo = true
      LEFT JOIN detalle_ventas dv  ON dv.producto_id = p.id
                                  AND dv.cantidad <= 10
      LEFT JOIN ventas_con_mes v   ON v.id = dv.venta_id
                                  AND v.anio_real = $1
                                  AND v.mes_real >= $2
      WHERE c.activo = true
      GROUP BY c.id, c.nombre
      ORDER BY total_unidades DESC
    `;

    const result = await pool.query(query, [anio, mes_inicio]);

    const categorias = result.rows.map((row: any) => ({
      categoria_id:   row.categoria_id,
      categoria:      row.categoria,
      total_unidades: parseInt(row.total_unidades),
    }));

    const categoriaEstrella = categorias.find(c => c.total_unidades > 0) ?? null;

    return res.json({
      success: true,
      data: { anio, mes_inicio, categorias, categoria_estrella: categoriaEstrella },
    });
  } catch (error) {
    console.error('❌ Error en getCategorias:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener categorías' });
  }
};

// ============================================================
// GET /api/prediccion/producto-estrella/:categoriaId?anio=2025&mes_inicio=3
// ============================================================
export const getProductoEstrella = async (req: Request, res: Response) => {
  try {
    const { categoriaId } = req.params;
    const { anio = 2025, mes_inicio = 1 } = req.query;

    const query = `
      ${CTE_MES_ANIO}
      SELECT
        p.id                          AS producto_id,
        p.nombre                      AS producto,
        p.stock_actual,
        COALESCE(SUM(dv.cantidad), 0) AS total_unidades,
        ROUND(
          COALESCE(SUM(dv.cantidad), 0)::numeric /
          NULLIF((
            SELECT SUM(dv2.cantidad)
            FROM detalle_ventas dv2
            JOIN productos p2       ON p2.id = dv2.producto_id
            JOIN ventas_con_mes v2  ON v2.id = dv2.venta_id
                                   AND v2.anio_real = $2
                                   AND v2.mes_real >= $3
            WHERE p2.categoria_id = $1
              AND dv2.cantidad <= 10
          ), 0) * 100, 1
        ) AS participacion_pct
      FROM productos p
      LEFT JOIN detalle_ventas dv  ON dv.producto_id = p.id
                                  AND dv.cantidad <= 10
      LEFT JOIN ventas_con_mes v   ON v.id = dv.venta_id
                                  AND v.anio_real = $2
                                  AND v.mes_real >= $3
      WHERE p.categoria_id = $1 AND p.activo = true
      GROUP BY p.id, p.nombre, p.stock_actual
      ORDER BY total_unidades DESC
    `;

    const result = await pool.query(query, [categoriaId, anio, mes_inicio]);

    if (result.rows.length === 0) {
      return res.json({ success: true, data: { productos: [], producto_estrella: null } });
    }

    const productos = result.rows.map((row: any) => ({
      producto_id:       row.producto_id,
      producto:          row.producto,
      stock_actual:      parseInt(row.stock_actual ?? 0),
      total_unidades:    parseInt(row.total_unidades),
      participacion_pct: parseFloat(row.participacion_pct ?? 0),
    }));

    const estrella = productos.find(p => p.total_unidades > 0) ?? productos[0];

    return res.json({
      success: true,
      data: { productos, producto_estrella: estrella },
    });
  } catch (error) {
    console.error('❌ Error en getProductoEstrella:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener producto estrella' });
  }
};

// ============================================================
// GET /api/prediccion/historico/:productoId?anio=2025&mes_inicio=3
// mes_inicio: primer mes del rango a analizar (Q0)
// mes_fin: último mes del rango (QT), por defecto 12
// ============================================================
export const getHistorico = async (req: Request, res: Response) => {
  try {
    const { productoId } = req.params;
    const { anio = 2025, mes_inicio = 1 } = req.query;

    const mesInicioNum = parseInt(String(mes_inicio));

    // Genera solo los meses del rango seleccionado
    const query = `
      ${CTE_MES_ANIO}
      SELECT
        mes_serie.mes                        AS mes,
        COALESCE(SUM(dv.cantidad), 0)        AS unidades
      FROM generate_series($3, 12) AS mes_serie(mes)
      LEFT JOIN ventas_con_mes v  ON v.mes_real = mes_serie.mes
                                 AND v.anio_real = $2
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
                                 AND dv.producto_id = $1
                                 AND dv.cantidad <= 10
      GROUP BY mes_serie.mes
      ORDER BY mes_serie.mes
    `;

    const result = await pool.query(query, [productoId, anio, mesInicioNum]);

    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const historico = result.rows.map((row: any, idx: number) => ({
      t:        idx,
      mes:      MESES[parseInt(row.mes) - 1],
      mes_num:  parseInt(row.mes),
      unidades: parseInt(row.unidades),
    }));

    // Q0 = primer mes del rango | QT = último mes del rango
    const q0 = historico[0].unidades > 0 ? historico[0].unidades : 1;
    const qT = historico[historico.length - 1].unidades > 0
      ? historico[historico.length - 1].unidades
      : 1;
    const T = historico.length - 1 || 1;

    // Detectar hasta qué mes hay datos reales
    const ultimoMesActivo = [...historico].reverse().find(h => h.unidades > 0)?.mes_num ?? 0;
    const mesFinReal      = ultimoMesActivo;

    // Si el último mes del generate_series no tiene datos (año incompleto),
    // usar el último mes activo como QT y recalcular T
    const anioActual     = new Date().getFullYear();
    const anioIncompleto = Number(anio) === anioActual && ultimoMesActivo < 12;

    const qTFinal = anioIncompleto
      ? (historico.find(h => h.mes_num === ultimoMesActivo)?.unidades ?? 1)
      : qT;
    const TFinal  = anioIncompleto
      ? (ultimoMesActivo - mesInicioNum) || 1
      : T;
    const kFinal  = calcularK(q0, qTFinal > 0 ? qTFinal : 1, TFinal);

    // Estadísticas descriptivas (solo meses con ventas reales)
    const conVentas = historico.filter(h => h.unidades > 0).map(h => h.unidades);
    const suma      = conVentas.reduce((a, b) => a + b, 0);
    const promedio  = conVentas.length > 0 ? suma / conVentas.length : 0;

    const freq: Record<number, number> = {};
    conVentas.forEach(u => { freq[u] = (freq[u] || 0) + 1; });
    const moda = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? String(promedio);

    return res.json({
      success: true,
      data: {
        anio,
        mes_inicio:         mesInicioNum,
        mes_fin_real:       mesFinReal,
        historico,
        anio_incompleto:    anioIncompleto,
        ultimo_mes_activo:  ultimoMesActivo,
        estadisticas: {
          total_anual:      suma,
          promedio_mensual: Math.round(promedio * 10) / 10,
          moda_mensual:     parseInt(moda),
          min:              conVentas.length > 0 ? Math.min(...conVentas) : 0,
          max:              conVentas.length > 0 ? Math.max(...conVentas) : 0,
          meses_con_ventas: conVentas.length,
          q0,
          qT:    qTFinal,
          k:     Math.round(kFinal * 10000) / 10000,
          k_pct: Math.round(kFinal * 1000)  / 10,
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
// lead_time_dias fijo en 7 días (según documento)
// ============================================================
export const getProyeccion = async (req: Request, res: Response) => {
  try {
    const {
      productoId,
      q0,
      qT,
      T_historico,
      stock_actual,
      meses_proyeccion = 6,
    } = req.body;

    const LEAD_TIME_DIAS = 7; // fijo según documento

    if (q0 === undefined || qT === undefined || stock_actual === undefined) {
      return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos' });
    }

    const T_hist = Number(T_historico) > 0 ? Number(T_historico) : 1;
    const k = calcularK(Number(q0), Number(qT), T_hist);

    const MESES_NOMBRES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const ahora = new Date();
    const proyeccion: any[] = [];
    let stockRestante  = parseFloat(stock_actual);
    let mesAgotamiento: number | null = null;
    let stockAcumulado = 0;

    for (let t = 1; t <= meses_proyeccion; t++) {
      const demanda = Math.max(1, Math.round(demandaProyectada(Number(qT), k, t)));
      stockAcumulado += demanda;
      stockRestante  -= demanda;

      const fechaMes  = new Date(ahora.getFullYear(), ahora.getMonth() + t, 1);
      const nombreMes = `${MESES_NOMBRES[fechaMes.getMonth()]} ${fechaMes.getFullYear()}`;

      if (stockRestante <= 0 && mesAgotamiento === null) mesAgotamiento = t;

      proyeccion.push({
        t,
        mes: nombreMes,
        demanda_proyectada:        demanda,
        stock_acumulado_necesario: stockAcumulado,
        stock_restante:            Math.round(stockRestante),
      });
    }

    const stockNec = Math.round(stockNecesario(Number(qT), k, Number(meses_proyeccion)));
    const deficit  = Math.max(stockNec - parseFloat(stock_actual), 0);

    let fechaAgotamiento  = null;
    let fechaLimitePedido = null;
    if (mesAgotamiento !== null) {
      const fa  = new Date(ahora.getFullYear(), ahora.getMonth() + mesAgotamiento, 1);
      fechaAgotamiento  = fa.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
      const flp = new Date(fa.getTime() - LEAD_TIME_DIAS * 24 * 60 * 60 * 1000);
      fechaLimitePedido = flp.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    let semaforo: 'verde' | 'amarillo' | 'rojo' = 'verde';
    if      (mesAgotamiento !== null && mesAgotamiento <= 1) semaforo = 'rojo';
    else if (mesAgotamiento !== null && mesAgotamiento <= 3) semaforo = 'amarillo';
    else if (mesAgotamiento !== null)                        semaforo = 'amarillo';

    return res.json({
      success: true,
      data: {
        parametros: {
          q0, qT, k,
          k_pct:        Math.round(k * 1000) / 10,
          T_historico:  T_hist,
          lead_time_dias: LEAD_TIME_DIAS,
          meses_proyeccion,
        },
        proyeccion,
        resumen: {
          stock_actual:             parseFloat(stock_actual),
          stock_necesario_semestre: stockNec,
          deficit_proyectado:       deficit,
          fecha_agotamiento:        fechaAgotamiento,
          fecha_limite_pedido:      fechaLimitePedido,
          semaforo,
          meses_hasta_agotamiento:  mesAgotamiento,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error en getProyeccion:', error);
    return res.status(500).json({ success: false, message: 'Error al calcular proyección' });
  }
};