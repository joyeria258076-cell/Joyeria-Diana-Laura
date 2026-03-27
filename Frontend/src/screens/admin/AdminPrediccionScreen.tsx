// Frontend/src/screens/admin/AdminPrediccionScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import './AdminPrediccionScreen.css';
import { prediccionAPI } from '../../services/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Categoria {
  categoria_id: number;
  categoria: string;
  total_unidades: number;
}

interface Producto {
  producto_id: number;
  producto: string;
  stock_actual: number;
  total_unidades: number;
  participacion_pct: number;
}

interface PuntoHistorico {
  t: number;
  mes: string;
  unidades: number;
}

interface PuntoProyeccion {
  t: number;
  mes: string;
  demanda_proyectada: number;
  stock_acumulado_necesario: number;
  stock_restante: number;
}

interface Resumen {
  stock_actual: number;
  stock_necesario_semestre: number;
  deficit_proyectado: number;
  fecha_agotamiento: string | null;
  fecha_limite_pedido: string | null;
  semaforo: 'verde' | 'amarillo' | 'rojo';
  meses_hasta_agotamiento: number | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = [ANIO_ACTUAL - 1, ANIO_ACTUAL - 2, ANIO_ACTUAL - 3];
const MESES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Helpers de gráfica SVG ───────────────────────────────────────────────────
const SVG_W = 680;
const SVG_H = 260;
const PAD = { top: 20, right: 30, bottom: 50, left: 52 };
const INNER_W = SVG_W - PAD.left - PAD.right;
const INNER_H = SVG_H - PAD.top - PAD.bottom;

function polyline(points: { x: number; y: number }[]) {
  return points.map(p => `${p.x},${p.y}`).join(' ');
}

function scaleY(val: number, min: number, max: number) {
  if (max === min) return PAD.top + INNER_H / 2;
  return PAD.top + INNER_H - ((val - min) / (max - min)) * INNER_H;
}

function scaleX(idx: number, total: number) {
  return PAD.left + (idx / (total - 1)) * INNER_W;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminPrediccionScreen() {
  const [anio, setAnio] = useState<number>(ANIO_ACTUAL - 1);
  const [mesesProyeccion, setMesesProyeccion] = useState<number>(6);
  const [leadTime, setLeadTime] = useState<number>(7);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaEstrella, setCategoriaEstrella] = useState<Categoria | null>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoEstrella, setProductoEstrella] = useState<Producto | null>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | null>(null);

  const [historico, setHistorico] = useState<PuntoHistorico[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [proyeccion, setProyeccion] = useState<PuntoProyeccion[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingProd, setLoadingProd] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [loadingProy, setLoadingProy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 1. Cargar categorías ──────────────────────────────────────────────────
  const cargarCategorias = useCallback(async () => {
    setLoadingCat(true);
    setError(null);
    try {
      const res = await prediccionAPI.getCategorias(anio);
      setCategorias(res.data.categorias);
      setCategoriaEstrella(res.data.categoria_estrella);
      const idEstrella = res.data.categoria_estrella?.categoria_id ?? null;
      setCategoriaSeleccionada(idEstrella);
    } catch {
      setError('No se pudieron cargar las categorías.');
    } finally {
      setLoadingCat(false);
    }
  }, [anio]);

  useEffect(() => { cargarCategorias(); }, [cargarCategorias]);

  // ── 2. Cargar productos al cambiar categoría ──────────────────────────────
  useEffect(() => {
    if (!categoriaSeleccionada) return;
    const cargar = async () => {
      setLoadingProd(true);
      setProductos([]);
      setProductoEstrella(null);
      setHistorico([]);
      setEstadisticas(null);
      setProyeccion([]);
      setResumen(null);
      try {
        const res = await prediccionAPI.getProductoEstrella(categoriaSeleccionada, anio);
        setProductos(res.data.productos);
        setProductoEstrella(res.data.producto_estrella);
        setProductoSeleccionado(res.data.producto_estrella?.producto_id ?? null);
      } catch {
        setError('No se pudieron cargar los productos.');
      } finally {
        setLoadingProd(false);
      }
    };
    cargar();
  }, [categoriaSeleccionada, anio]);

  // ── 3. Cargar histórico al cambiar producto ───────────────────────────────
  useEffect(() => {
    if (!productoSeleccionado) return;
    const cargar = async () => {
      setLoadingHist(true);
      setProyeccion([]);
      setResumen(null);
      try {
        const res = await prediccionAPI.getHistorico(productoSeleccionado, anio);
        setHistorico(res.data.historico);
        setEstadisticas(res.data.estadisticas);
      } catch {
        setError('No se pudo cargar el histórico.');
      } finally {
        setLoadingHist(false);
      }
    };
    cargar();
  }, [productoSeleccionado, anio]);

  // ── 4. Calcular proyección ────────────────────────────────────────────────
  const calcularProyeccion = async () => {
    if (!estadisticas || !productoSeleccionado || !productoEstrella) return;
    setLoadingProy(true);
    setError(null);
    try {
      const prod = productos.find(p => p.producto_id === productoSeleccionado) ?? productoEstrella;
      const res = await prediccionAPI.getProyeccion({
        productoId: productoSeleccionado,
        q0: estadisticas.q0,
        qT: estadisticas.qT,
        T_historico: 11,
        stock_actual: prod.stock_actual,
        lead_time_dias: leadTime,
        meses_proyeccion: mesesProyeccion,
      });
      setProyeccion(res.data.proyeccion);
      setResumen(res.data.resumen);
    } catch {
      setError('Error al calcular la proyección.');
    } finally {
      setLoadingProy(false);
    }
  };

  // ── Gráfica 1: Barras de categorías ──────────────────────────────────────
  const maxCat = Math.max(...categorias.map(c => c.total_unidades), 1);
  const BAR_W = categorias.length > 0 ? Math.max(20, Math.floor((INNER_W - (categorias.length - 1) * 12) / categorias.length)) : 40;

  // ── Gráfica 2: Línea histórica + proyección ───────────────────────────────
  const allVals = [
    ...historico.map(h => h.unidades),
    ...proyeccion.map(p => p.demanda_proyectada),
  ];
  const minV = 0;
  const maxV = Math.max(...allVals, 1) * 1.15;

  const histPoints = historico.map((h, i) => ({
    x: scaleX(i, historico.length + proyeccion.length || 1),
    y: scaleY(h.unidades, minV, maxV),
  }));

  const proyPoints = proyeccion.map((p, i) => ({
    x: scaleX(historico.length + i, historico.length + proyeccion.length || 1),
    y: scaleY(p.demanda_proyectada, minV, maxV),
  }));

  const allPoints = [...histPoints, ...proyPoints];
  const labelStep = Math.ceil((historico.length + proyeccion.length) / 12);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pred-screen">
      {/* ── ENCABEZADO ── */}
      <div className="pred-header">
        <div className="pred-header__title">
          <span className="pred-header__icon">📈</span>
          <div>
            <h1>Modelo Predictivo de Inventario</h1>
            <p>Identificación de categoría estrella · Proyección de demanda · Gestión de reabastecimiento</p>
          </div>
        </div>
        <div className="pred-header__controls">
          <div className="pred-control-group">
            <label>Año de análisis</label>
            <select value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="pred-control-group">
            <label>Meses a proyectar</label>
            <select value={mesesProyeccion} onChange={e => setMesesProyeccion(Number(e.target.value))}>
              {[3,4,5,6,9,12].map(m => <option key={m} value={m}>{m} meses</option>)}
            </select>
          </div>
          <div className="pred-control-group">
            <label>Lead time (días)</label>
            <input
              type="number" min={1} max={60} value={leadTime}
              onChange={e => setLeadTime(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {error && <div className="pred-error">⚠️ {error}</div>}

      {/* ── SECCIÓN 1: CATEGORÍAS ── */}
      <section className="pred-section">
        <div className="pred-section__head">
          <h2>① Clasificación por categoría</h2>
          <span className="pred-badge">Año {anio}</span>
        </div>

        {loadingCat ? (
          <div className="pred-loading">Cargando categorías…</div>
        ) : (
          <div className="pred-row">
            {/* Gráfica barras */}
            <div className="pred-card pred-card--chart">
              <p className="pred-card__label">Unidades vendidas por categoría</p>
              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="pred-svg">
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map(f => {
                  const y = PAD.top + (1 - f) * INNER_H;
                  return (
                    <g key={f}>
                      <line x1={PAD.left} y1={y} x2={SVG_W - PAD.right} y2={y} stroke="var(--pred-grid)" strokeWidth={1} />
                      <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--pred-muted)">
                        {Math.round(f * maxCat)}
                      </text>
                    </g>
                  );
                })}

                {categorias.map((cat, i) => {
                  const bw = Math.min(BAR_W, 60);
                  const gap = (INNER_W - categorias.length * bw) / (categorias.length - 1 || 1);
                  const bx = PAD.left + i * (bw + gap);
                  const bh = (cat.total_unidades / maxCat) * INNER_H;
                  const by = PAD.top + INNER_H - bh;
                  const isEstrella = cat.categoria_id === categoriaEstrella?.categoria_id;
                  const isSelected = cat.categoria_id === categoriaSeleccionada;

                  return (
                    <g key={cat.categoria_id} style={{ cursor: 'pointer' }}
                      onClick={() => setCategoriaSeleccionada(cat.categoria_id)}>
                      <rect
                        x={bx} y={by} width={bw} height={bh}
                        rx={4}
                        fill={isSelected ? 'var(--pred-accent)' : isEstrella ? 'var(--pred-estrella)' : 'var(--pred-bar)'}
                        opacity={isSelected ? 1 : 0.75}
                      />
                      {isEstrella && (
                        <text x={bx + bw / 2} y={by - 6} textAnchor="middle" fontSize={12}>⭐</text>
                      )}
                      <text x={bx + bw / 2} y={by - (isEstrella ? 18 : 6)} textAnchor="middle" fontSize={10} fill="var(--pred-muted)">
                        {cat.total_unidades}
                      </text>
                      <text
                        x={bx + bw / 2}
                        y={PAD.top + INNER_H + 16}
                        textAnchor="middle" fontSize={10} fill="var(--pred-text)"
                        style={{ maxWidth: bw }}
                      >
                        {cat.categoria.length > 8 ? cat.categoria.slice(0, 7) + '…' : cat.categoria}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <p className="pred-chart-hint">Haz clic en una barra para analizar esa categoría</p>
            </div>

            {/* Tabla categorías */}
            <div className="pred-card pred-card--table">
              <p className="pred-card__label">Ranking de categorías</p>
              <table className="pred-table">
                <thead>
                  <tr><th>#</th><th>Categoría</th><th>Unidades</th><th></th></tr>
                </thead>
                <tbody>
                  {categorias.map((cat, i) => (
                    <tr
                      key={cat.categoria_id}
                      className={cat.categoria_id === categoriaSeleccionada ? 'pred-table__row--active' : ''}
                      onClick={() => setCategoriaSeleccionada(cat.categoria_id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="pred-table__rank">{i + 1}</td>
                      <td>
                        {cat.categoria_id === categoriaEstrella?.categoria_id && <span className="pred-star">⭐ </span>}
                        {cat.categoria}
                      </td>
                      <td><strong>{cat.total_unidades.toLocaleString()}</strong></td>
                      <td>
                        <div className="pred-mini-bar">
                          <div className="pred-mini-bar__fill" style={{ width: `${(cat.total_unidades / maxCat) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── SECCIÓN 2: PRODUCTO ESTRELLA ── */}
      {categoriaSeleccionada && (
        <section className="pred-section">
          <div className="pred-section__head">
            <h2>② Producto estrella — {categorias.find(c => c.categoria_id === categoriaSeleccionada)?.categoria}</h2>
          </div>

          {loadingProd ? (
            <div className="pred-loading">Cargando productos…</div>
          ) : (
            <div className="pred-row">
              <div className="pred-card pred-card--table pred-card--wide">
                <p className="pred-card__label">Ranking de productos en la categoría</p>
                <table className="pred-table">
                  <thead>
                    <tr><th>#</th><th>Producto</th><th>Unidades 2024</th><th>Participación</th><th>Stock actual</th></tr>
                  </thead>
                  <tbody>
                    {productos.map((prod, i) => (
                      <tr
                        key={prod.producto_id}
                        className={prod.producto_id === productoSeleccionado ? 'pred-table__row--active' : ''}
                        onClick={() => setProductoSeleccionado(prod.producto_id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="pred-table__rank">{i + 1}</td>
                        <td>
                          {prod.producto_id === productoEstrella?.producto_id && <span className="pred-star">⭐ </span>}
                          {prod.producto}
                        </td>
                        <td><strong>{prod.total_unidades.toLocaleString()}</strong></td>
                        <td>
                          <div className="pred-pill">{prod.participacion_pct}%</div>
                        </td>
                        <td>{prod.stock_actual} uds</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── SECCIÓN 3: ESTADÍSTICAS + HISTÓRICO ── */}
      {productoSeleccionado && !loadingProd && (
        <section className="pred-section">
          <div className="pred-section__head">
            <h2>③ Histórico de demanda — {productos.find(p => p.producto_id === productoSeleccionado)?.producto ?? productoEstrella?.producto}</h2>
          </div>

          {loadingHist ? (
            <div className="pred-loading">Cargando histórico…</div>
          ) : estadisticas && (
            <>
              {/* KPIs */}
              <div className="pred-kpis">
                {[
                  { label: 'Total anual', val: `${estadisticas.total_anual} uds`, icon: '📦' },
                  { label: 'Promedio mensual', val: `${estadisticas.promedio_mensual} uds`, icon: '📊' },
                  { label: 'Moda mensual', val: `${estadisticas.moda_mensual} uds`, icon: '📐' },
                  { label: 'Mínimo mensual', val: `${estadisticas.min} uds`, icon: '📉' },
                  { label: 'Máximo mensual', val: `${estadisticas.max} uds`, icon: '📈' },
                  { label: 'Tasa k mensual', val: `${estadisticas.k_pct}%`, icon: '⚡' },
                ].map(kpi => (
                  <div key={kpi.label} className="pred-kpi">
                    <span className="pred-kpi__icon">{kpi.icon}</span>
                    <span className="pred-kpi__val">{kpi.val}</span>
                    <span className="pred-kpi__label">{kpi.label}</span>
                  </div>
                ))}
              </div>

              {/* Tabla histórico */}
              <div className="pred-row">
                <div className="pred-card pred-card--table">
                  <p className="pred-card__label">Ventas mensuales {anio}</p>
                  <table className="pred-table pred-table--compact">
                    <thead>
                      <tr><th>t</th><th>Mes</th><th>Unidades Q(t)</th><th>Variación</th></tr>
                    </thead>
                    <tbody>
                      {historico.map((h, i) => {
                        const prev = i > 0 ? historico[i - 1].unidades : null;
                        const variacion = prev && prev > 0 ? ((h.unidades - prev) / prev * 100).toFixed(1) : null;
                        return (
                          <tr key={h.t}>
                            <td className="pred-table__rank">{h.t}</td>
                            <td>{h.mes}</td>
                            <td><strong>{h.unidades}</strong></td>
                            <td>
                              {variacion !== null && (
                                <span className={`pred-var ${parseFloat(variacion) >= 0 ? 'pred-var--up' : 'pred-var--down'}`}>
                                  {parseFloat(variacion) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(variacion))}%
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Fórmulas */}
                <div className="pred-card pred-card--formula">
                  <p className="pred-card__label">Modelo matemático aplicado</p>
                  <div className="pred-formula-block">
                    <div className="pred-formula">
                      <span className="pred-formula__name">Ley de Crecimiento</span>
                      <span className="pred-formula__eq">dQ/dt = k · Q(t)</span>
                    </div>
                    <div className="pred-formula">
                      <span className="pred-formula__name">Solución analítica</span>
                      <span className="pred-formula__eq">Q(t) = Q₀ · e^(kt)</span>
                    </div>
                    <div className="pred-formula">
                      <span className="pred-formula__name">Stock en T meses</span>
                      <span className="pred-formula__eq">∫Q(t)dt = (Q₀/k)·(e^(kT)−1)</span>
                    </div>
                    <div className="pred-formula">
                      <span className="pred-formula__name">Tasa de crecimiento</span>
                      <span className="pred-formula__eq">k = ln(Q_T / Q₀) / T</span>
                    </div>
                  </div>

                  <div className="pred-params">
                    <p className="pred-card__label" style={{ marginTop: '1rem' }}>Condiciones iniciales</p>
                    <div className="pred-param-row"><span>Q₀ (mes mínimo)</span><strong>{estadisticas.q0} uds</strong></div>
                    <div className="pred-param-row"><span>Q_T (mes máximo)</span><strong>{estadisticas.qT} uds</strong></div>
                    <div className="pred-param-row"><span>T (meses)</span><strong>11</strong></div>
                    <div className="pred-param-row"><span>k calculado</span><strong>{estadisticas.k}</strong></div>
                    <div className="pred-param-row"><span>k%</span><strong>{estadisticas.k_pct}% mensual</strong></div>
                  </div>

                  <button className="pred-btn pred-btn--primary" onClick={calcularProyeccion} disabled={loadingProy}>
                    {loadingProy ? '⏳ Calculando…' : '🔮 Generar proyección'}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── SECCIÓN 4: PROYECCIÓN ── */}
      {proyeccion.length > 0 && resumen && (
        <section className="pred-section">
          <div className="pred-section__head">
            <h2>④ Proyección de demanda e inventario</h2>
            <span className={`pred-semaforo pred-semaforo--${resumen.semaforo}`}>
              {resumen.semaforo === 'verde' ? '🟢 Stock suficiente' :
               resumen.semaforo === 'amarillo' ? '🟡 Stock en riesgo' : '🔴 Alerta de desabasto'}
            </span>
          </div>

          {/* Resumen ejecutivo */}
          <div className="pred-resumen">
            {[
              { label: 'Stock actual', val: `${resumen.stock_actual} uds`, color: 'default' },
              { label: `Stock necesario (${mesesProyeccion} meses)`, val: `${resumen.stock_necesario_semestre} uds`, color: 'default' },
              { label: 'Déficit proyectado', val: `${resumen.deficit_proyectado} uds`, color: 'danger' },
              { label: 'Agotamiento estimado', val: resumen.fecha_agotamiento ?? 'No se agota en el período', color: 'warning' },
              { label: 'Fecha límite de pedido', val: resumen.fecha_limite_pedido ?? '—', color: 'warning' },
              { label: 'Lead time proveedor', val: `${leadTime} días`, color: 'default' },
            ].map(item => (
              <div key={item.label} className={`pred-resumen-item pred-resumen-item--${item.color}`}>
                <span className="pred-resumen-item__label">{item.label}</span>
                <strong className="pred-resumen-item__val">{item.val}</strong>
              </div>
            ))}
          </div>

          {/* Gráfica histórica + proyección combinada */}
          <div className="pred-card pred-card--chart-wide">
            <p className="pred-card__label">
              Demanda histórica <span className="pred-legend pred-legend--hist">■</span> vs proyectada <span className="pred-legend pred-legend--proy">■</span>
            </p>
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="pred-svg">
              {/* Grid horizontal */}
              {[0, 0.25, 0.5, 0.75, 1].map(f => {
                const y = PAD.top + (1 - f) * INNER_H;
                return (
                  <g key={f}>
                    <line x1={PAD.left} y1={y} x2={SVG_W - PAD.right} y2={y}
                      stroke="var(--pred-grid)" strokeWidth={1} strokeDasharray="4,3" />
                    <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--pred-muted)">
                      {Math.round(f * maxV)}
                    </text>
                  </g>
                );
              })}

              {/* Línea divisoria histórico/proyección */}
              {histPoints.length > 0 && proyPoints.length > 0 && (
                <line
                  x1={histPoints[histPoints.length - 1].x}
                  y1={PAD.top}
                  x2={histPoints[histPoints.length - 1].x}
                  y2={PAD.top + INNER_H}
                  stroke="var(--pred-muted)" strokeWidth={1} strokeDasharray="6,4"
                />
              )}

              {/* Área histórica */}
              {histPoints.length > 1 && (
                <polyline
                  points={polyline([
                    { x: histPoints[0].x, y: PAD.top + INNER_H },
                    ...histPoints,
                    { x: histPoints[histPoints.length - 1].x, y: PAD.top + INNER_H },
                  ])}
                  fill="var(--pred-hist-fill)" stroke="none"
                />
              )}

              {/* Línea histórica */}
              {histPoints.length > 1 && (
                <polyline points={polyline(histPoints)}
                  fill="none" stroke="var(--pred-hist)" strokeWidth={2.5} />
              )}

              {/* Área proyección */}
              {proyPoints.length > 1 && (
                <polyline
                  points={polyline([
                    { x: proyPoints[0].x, y: PAD.top + INNER_H },
                    ...proyPoints,
                    { x: proyPoints[proyPoints.length - 1].x, y: PAD.top + INNER_H },
                  ])}
                  fill="var(--pred-proy-fill)" stroke="none"
                />
              )}

              {/* Línea proyección */}
              {proyPoints.length > 1 && (
                <polyline points={polyline(proyPoints)}
                  fill="none" stroke="var(--pred-proy)" strokeWidth={2.5} strokeDasharray="8,4" />
              )}

              {/* Puntos */}
              {allPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3.5}
                  fill={i < histPoints.length ? 'var(--pred-hist)' : 'var(--pred-proy)'} />
              ))}

              {/* Etiquetas eje X */}
              {allPoints.map((p, i) => {
                if (i % labelStep !== 0 && i !== allPoints.length - 1) return null;
                const label = i < historico.length
                  ? historico[i].mes
                  : proyeccion[i - historico.length]?.mes.slice(0, 7) ?? '';
                return (
                  <text key={i} x={p.x} y={PAD.top + INNER_H + 18}
                    textAnchor="middle" fontSize={9} fill="var(--pred-muted)">
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Tabla proyección */}
          <div className="pred-card pred-card--table pred-card--wide">
            <p className="pred-card__label">Detalle de proyección mes a mes</p>
            <table className="pred-table">
              <thead>
                <tr>
                  <th>t</th>
                  <th>Mes</th>
                  <th>Q(t) proyectada</th>
                  <th>Stock acumulado necesario</th>
                  <th>Stock restante</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {proyeccion.map(p => {
                  const estado =
                    p.stock_restante <= 0 ? 'rojo' :
                    p.stock_restante < p.demanda_proyectada * 2 ? 'amarillo' : 'verde';
                  return (
                    <tr key={p.t}>
                      <td className="pred-table__rank">{p.t}</td>
                      <td>{p.mes}</td>
                      <td><strong>{p.demanda_proyectada}</strong> uds</td>
                      <td>{p.stock_acumulado_necesario} uds</td>
                      <td className={`pred-stock-${estado}`}>{p.stock_restante} uds</td>
                      <td>
                        <span className={`pred-chip pred-chip--${estado}`}>
                          {estado === 'verde' ? '✓ OK' : estado === 'amarillo' ? '⚠ Riesgo' : '✗ Desabasto'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}