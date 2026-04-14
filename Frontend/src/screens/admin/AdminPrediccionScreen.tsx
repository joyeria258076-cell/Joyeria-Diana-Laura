import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { prediccionAPI } from '../../services/api';
import './AdminPrediccionScreen.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
);

const MESES_NOMBRES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface Categoria {
  categoria_id:   number;
  categoria:      string;
  total_unidades: number;
}

interface Producto {
  producto_id:       number;
  producto:          string;
  stock_actual:      number;
  total_unidades:    number;
  participacion_pct: number;
}

type TipoGraficaCat  = 'bar' | 'line';
type TipoGraficaProd = 'bar' | 'line';

export default function AdminPrediccionScreen() {

  // ── selectores ────────────────────────────────────────────────────────────
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([]);
  const [mesesDisponibles, setMesesDisponibles] = useState<number[]>([]);
  const [anio,             setAnio]             = useState<number | null>(null);
  const [mesInicio,        setMesInicio]        = useState<number>(1);
  const [mesesProyeccion,  setMesesProyeccion]  = useState<number>(6);

  // ── tipo de gráfica ───────────────────────────────────────────────────────
  const [tipoCat,  setTipoCat]  = useState<TipoGraficaCat>('bar');
  const [tipoProd, setTipoProd] = useState<TipoGraficaProd>('line');

  // ── datos ─────────────────────────────────────────────────────────────────
  const [categorias,            setCategorias]            = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  const [productos,             setProductos]             = useState<Producto[]>([]);
  const [productoSeleccionado,  setProductoSeleccionado]  = useState<number | null>(null);
  const [historico,             setHistorico]             = useState<any[]>([]);
  const [estadisticas,          setEstadisticas]          = useState<any>(null);
  const [proyeccion,            setProyeccion]            = useState<any[]>([]);
  const [resumen,               setResumen]               = useState<any>(null);

  // ── año incompleto ────────────────────────────────────────────────────────
  const [anioIncompleto,  setAnioIncompleto]  = useState(false);
  const [ultimoMesActivo, setUltimoMesActivo] = useState<number>(0);

  // ── control ───────────────────────────────────────────────────────────────
  const [analisisGenerado, setAnalisisGenerado] = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');
  const [graficaKey,       setGraficaKey]       = useState(0);

  // ── paginación / búsqueda ─────────────────────────────────────────────────
  const [paginaProductos,  setPaginaProductos]  = useState(1);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const productosPorPagina = 10;

  // ── 0. Años ───────────────────────────────────────────────────────────────
  useEffect(() => {
    prediccionAPI.getAnios()
      .then((res: any) => {
        const anios: number[] = res.data.anios;
        setAniosDisponibles(anios);
        if (anios.length > 0) setAnio(anios[0]);
      })
      .catch(() => setError('No se pudieron cargar los años disponibles.'));
  }, []);

  // ── 1. Meses disponibles cuando cambia el año ─────────────────────────────
  useEffect(() => {
    if (!anio) return;
    prediccionAPI.getMesesDisponibles(anio)
      .then((res: any) => {
        const meses: number[] = res.data.meses;
        setMesesDisponibles(meses);
        setMesInicio(meses[0] ?? 1);
      })
      .catch(() => setMesesDisponibles([]));
    resetResultados();
  }, [anio]);

  const resetResultados = () => {
    setAnalisisGenerado(false);
    setCategorias([]);
    setCategoriaSeleccionada(null);
    setProductos([]);
    setProductoSeleccionado(null);
    setHistorico([]);
    setEstadisticas(null);
    setProyeccion([]);
    setResumen(null);
    setAnioIncompleto(false);
    setUltimoMesActivo(0);
    setGraficaKey(k => k + 1);
  };

  // ── helper ────────────────────────────────────────────────────────────────
  const cargarHistoricoYProyeccion = useCallback(async (
    prodId:    number,
    prods:     Producto[],
    anioAct:   number,
    mesIni:    number,
    mesesProy: number,
  ) => {
    const resHist = await prediccionAPI.getHistorico(prodId, anioAct, mesIni);
    const { historico: hist, estadisticas: stats, anio_incompleto, ultimo_mes_activo } = resHist.data;

    setHistorico(hist);
    setEstadisticas(stats);
    setAnioIncompleto(anio_incompleto ?? false);
    setUltimoMesActivo(ultimo_mes_activo ?? 0);
    setGraficaKey(k => k + 1);

    const prod = prods.find(p => p.producto_id === prodId) ?? prods[0];
    if (!prod) return;

    const T_hist = anio_incompleto
      ? (ultimo_mes_activo - mesIni) || 1
      : (stats.meses_con_ventas > 1 ? stats.meses_con_ventas - 1 : 1);

    const resProy = await prediccionAPI.getProyeccion({
      productoId:       prodId,
      q0:               stats.q0,
      qT:               stats.qT,
      T_historico:      T_hist,
      stock_actual:     prod.stock_actual,
      meses_proyeccion: mesesProy,
    });

    setProyeccion(resProy.data.proyeccion);
    setResumen(resProy.data.resumen);
  }, []);

  // ── 2. Generar análisis ───────────────────────────────────────────────────
  const generarAnalisis = useCallback(async () => {
    if (!anio) return;
    setLoading(true);
    setError('');
    resetResultados();
    try {
      const resCat  = await prediccionAPI.getCategorias(anio, mesInicio);
      const cats: Categoria[]             = resCat.data.categorias;
      const estrellaCat: Categoria | null = resCat.data.categoria_estrella;
      setCategorias(cats);

      const catId = estrellaCat?.categoria_id ?? cats[0]?.categoria_id ?? null;
      if (!catId) { setAnalisisGenerado(true); return; }
      setCategoriaSeleccionada(catId);

      const resProd = await prediccionAPI.getProductoEstrella(catId, anio, mesInicio);
      const prods: Producto[]             = resProd.data.productos;
      const estrellaProd: Producto | null = resProd.data.producto_estrella;
      setProductos(prods);
      setPaginaProductos(1);
      setBusquedaProducto('');

      const prodId = estrellaProd?.producto_id ?? prods[0]?.producto_id ?? null;
      if (!prodId) { setAnalisisGenerado(true); return; }
      setProductoSeleccionado(prodId);

      await cargarHistoricoYProyeccion(prodId, prods, anio, mesInicio, mesesProyeccion);
      setAnalisisGenerado(true);
    } catch {
      setError('Error al generar el análisis. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [anio, mesInicio, mesesProyeccion, cargarHistoricoYProyeccion]);

  // ── 3. Cambiar categoría ──────────────────────────────────────────────────
  const seleccionarCategoria = async (catId: number) => {
    if (!anio || !analisisGenerado || catId === categoriaSeleccionada) return;
    setCategoriaSeleccionada(catId);
    setProductos([]);
    setProductoSeleccionado(null);
    setHistorico([]);
    setEstadisticas(null);
    setProyeccion([]);
    setResumen(null);
    setGraficaKey(k => k + 1);
    setLoading(true);
    try {
      const resProd = await prediccionAPI.getProductoEstrella(catId, anio, mesInicio);
      const prods: Producto[] = resProd.data.productos;
      setProductos(prods);
      setPaginaProductos(1);
      setBusquedaProducto('');
      const prodId = resProd.data.producto_estrella?.producto_id ?? prods[0]?.producto_id ?? null;
      if (!prodId) return;
      setProductoSeleccionado(prodId);
      await cargarHistoricoYProyeccion(prodId, prods, anio, mesInicio, mesesProyeccion);
    } catch {
      setError('Error al cargar productos.');
    } finally {
      setLoading(false);
    }
  };

  // ── 4. Cambiar producto ───────────────────────────────────────────────────
  const seleccionarProducto = async (prodId: number) => {
    if (!anio || !analisisGenerado || prodId === productoSeleccionado) return;
    setProductoSeleccionado(prodId);
    setHistorico([]);
    setEstadisticas(null);
    setProyeccion([]);
    setResumen(null);
    setGraficaKey(k => k + 1);
    setLoading(true);
    try {
      await cargarHistoricoYProyeccion(prodId, productos, anio, mesInicio, mesesProyeccion);
    } catch {
      setError('Error al cargar el histórico del producto.');
    } finally {
      setLoading(false);
    }
  };

  // ── paginación ────────────────────────────────────────────────────────────
  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto) return productos;
    return productos.filter(p =>
      p.producto.toLowerCase().includes(busquedaProducto.toLowerCase())
    );
  }, [productos, busquedaProducto]);

  const totalPaginas       = Math.ceil(productosFiltrados.length / productosPorPagina);
  const productosPaginados = productosFiltrados.slice(
    (paginaProductos - 1) * productosPorPagina,
    paginaProductos * productosPorPagina,
  );

  // ── opciones comunes de Chart.js ──────────────────────────────────────────
  const commonOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend:  { labels: { color: '#e8e8f0' } },
      tooltip: { backgroundColor: '#1a1a22', titleColor: '#ecb2c3', bodyColor: '#e8e8f0' },
    },
    scales: {
      x: { grid: { color: '#2a2a38' }, ticks: { color: '#e8e8f0' } },
      y: { grid: { color: '#2a2a38' }, ticks: { color: '#e8e8f0' }, beginAtZero: true },
    },
  };

  // ── datos gráfica CATEGORÍAS ──────────────────────────────────────────────
  const catLabels  = categorias.map(c => c.categoria);
  const catValues  = categorias.map(c => c.total_unidades);
  const catColors  = categorias.map(c =>
    c.categoria_id === categoriaSeleccionada ? 'rgba(236,178,195,1)' : 'rgba(236,178,195,0.45)'
  );

  const catBarData = {
    labels: catLabels,
    datasets: [{
      label: 'Unidades vendidas',
      data:  catValues,
      backgroundColor: catColors,
      borderColor: '#ecb2c3',
      borderWidth: 1,
    }],
  };

  const catLineData = {
    labels: catLabels,
    datasets: [{
      label:               'Unidades vendidas',
      data:                catValues,
      borderColor:         '#ecb2c3',
      backgroundColor:     'rgba(236,178,195,0.15)',
      borderWidth:         2.5,
      pointBackgroundColor: catColors,
      pointBorderColor:    '#fff',
      pointRadius:         5,
      tension:             0.3,
      fill:                true,
    }],
  };

  const catOptions = {
    ...commonOptions,
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0) seleccionarCategoria(categorias[elements[0].index].categoria_id);
    },
  };

  // ── datos gráfica PRODUCTO (histórico + proyección) ───────────────────────
  const prodLabels = [
    ...historico.map((h: any) => h.mes),
    ...proyeccion.map((p: any) => p.mes),
  ];

  const prodDatasets = [
    {
      label:               'Demanda histórica',
      data: [
        ...historico.map((h: any)  => h.unidades),
        ...Array(proyeccion.length).fill(null),
      ],
      borderColor:         '#7eb8f7',
      backgroundColor:     'rgba(126,184,247,0.15)',
      borderWidth:         2.5,
      pointBackgroundColor:'#7eb8f7',
      pointBorderColor:    '#fff',
      pointRadius:         4,
      tension:             0.3,
      fill:                true,
    },
    {
      label:               'Demanda proyectada',
      data: [
        ...Array(historico.length).fill(null),
        ...proyeccion.map((p: any) => p.demanda_proyectada),
      ],
      borderColor:         '#f0a060',
      backgroundColor:     'rgba(240,160,96,0.15)',
      borderWidth:         2.5,
      borderDash:          [6, 4],
      pointBackgroundColor:'#f0a060',
      pointBorderColor:    '#fff',
      pointRadius:         4,
      tension:             0.3,
      fill:                true,
    },
  ];

  // Para barra: histórico y proyección como datasets separados
  const prodBarData = {
    labels: prodLabels,
    datasets: [
      {
        label:           'Demanda histórica',
        data: [
          ...historico.map((h: any)  => h.unidades),
          ...Array(proyeccion.length).fill(null),
        ],
        backgroundColor: 'rgba(126,184,247,0.7)',
        borderColor:     '#7eb8f7',
        borderWidth:     1,
      },
      {
        label:           'Demanda proyectada',
        data: [
          ...Array(historico.length).fill(null),
          ...proyeccion.map((p: any) => p.demanda_proyectada),
        ],
        backgroundColor: 'rgba(240,160,96,0.7)',
        borderColor:     '#f0a060',
        borderWidth:     1,
      },
    ],
  };

  const prodLineData = { labels: prodLabels, datasets: prodDatasets };

  const categoriaNombre = categorias.find(c => c.categoria_id === categoriaSeleccionada)?.categoria ?? '';
  const productoNombre  = productos.find(p => p.producto_id === productoSeleccionado)?.producto ?? '';

  // ── componente selector de tipo de gráfica ────────────────────────────────
  const SelectorGrafica = ({
    valor, onChange,
  }: { valor: string; onChange: (v: any) => void }) => (
    <div className="selector-grafica">
      <button
        className={valor === 'bar' ? 'activo' : ''}
        onClick={() => onChange('bar')}
        title="Gráfica de barras"
      >▮▮</button>
      <button
        className={valor === 'line' ? 'activo' : ''}
        onClick={() => onChange('line')}
        title="Gráfica de líneas"
      >↗</button>
    </div>
  );

  return (
    <div className="prediccion-container">
      <h1>📈 Modelo Predictivo de Inventario</h1>
      <p>Identificación de categoría estrella · Proyección de demanda · Gestión de reabastecimiento</p>

      {error && <div className="error-message">❌ {error}</div>}

      {/* ── CONTROLES ── */}
      <div className="panel-controles">
        <div className="control">
          <label>📅 Año de análisis</label>
          <select value={anio ?? ''} onChange={e => setAnio(Number(e.target.value))}>
            {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="control">
          <label>📆 Mes de inicio</label>
          <select
            value={mesInicio}
            onChange={e => { setMesInicio(Number(e.target.value)); resetResultados(); }}
          >
            {mesesDisponibles.map(m => (
              <option key={m} value={m}>{MESES_NOMBRES[m]}</option>
            ))}
          </select>
        </div>
        <div className="control">
          <label>📊 Meses a proyectar</label>
          <select value={mesesProyeccion} onChange={e => setMesesProyeccion(Number(e.target.value))}>
            {[3, 6, 9, 12].map(m => <option key={m} value={m}>{m} meses</option>)}
          </select>
        </div>
        <div className="control control--btn">
          <button
            className="btn-generar"
            onClick={generarAnalisis}
            disabled={loading || !anio || mesesDisponibles.length === 0}
          >
            {loading ? '⏳ Analizando...' : '🔍 Generar análisis'}
          </button>
        </div>
      </div>

      {/* ── ESTADO INICIAL ── */}
      {!analisisGenerado && !loading && (
        <div className="estado-inicial">
          <span>📊</span>
          <p>Selecciona año, mes de inicio y meses a proyectar, luego pulsa <strong>Generar análisis</strong>.</p>
          {mesesDisponibles.length > 0 && (
            <p style={{ fontSize: '0.8rem' }}>
              Datos disponibles en {anio}: {mesesDisponibles.map(m => MESES_NOMBRES[m]).join(', ')}
            </p>
          )}
        </div>
      )}

      {loading && <div className="loading-message">⏳ Procesando datos...</div>}

      {/* ── RESULTADOS ── */}
      {analisisGenerado && !loading && (
        <>
          {anioIncompleto && (
            <div className="alerta alerta-amarillo" style={{ marginBottom: '10px' }}>
              ⚠️ Año incompleto — datos disponibles hasta{' '}
              <strong>{MESES_NOMBRES[ultimoMesActivo]} {anio}</strong>.
              El modelo usa Q₀ = {MESES_NOMBRES[mesInicio]} y
              QT = {MESES_NOMBRES[ultimoMesActivo]}, con T = {ultimoMesActivo - mesInicio} meses.
            </div>
          )}

          {/* CATEGORÍAS */}
          <section>
            <div className="seccion-header">
              <h2>🏆 Categorías — {anio} (desde {MESES_NOMBRES[mesInicio]})</h2>
              <SelectorGrafica valor={tipoCat} onChange={setTipoCat} />
            </div>
            <div className="grafica-container">
              {tipoCat === 'bar'
                ? <Bar  key={`cat-bar-${anio}-${mesInicio}`}  data={catBarData}  options={catOptions} />
                : <Line key={`cat-line-${anio}-${mesInicio}`} data={catLineData} options={catOptions} />
              }
            </div>
            <p className="hint">Haz clic en la gráfica o en "Analizar" para explorar esa categoría.</p>
            <table className="tabla-datos">
              <thead><tr><th>#</th><th>Categoría</th><th>Unidades</th><th></th></tr></thead>
              <tbody>
                {categorias.map((cat, idx) => (
                  <tr
                    key={cat.categoria_id}
                    className={cat.categoria_id === categoriaSeleccionada ? 'fila-activa' : ''}
                  >
                    <td>{idx + 1}</td>
                    <td>{cat.categoria} {idx === 0 && cat.total_unidades > 0 && '⭐'}</td>
                    <td><strong>{cat.total_unidades}</strong></td>
                    <td><button onClick={() => seleccionarCategoria(cat.categoria_id)}>Analizar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* PRODUCTOS */}
          {productos.length > 0 && (
            <section>
              <h2>✨ Productos — {categoriaNombre}</h2>
              <div className="barra-busqueda">
                <input
                  type="text"
                  placeholder="🔍 Buscar producto..."
                  value={busquedaProducto}
                  onChange={e => { setBusquedaProducto(e.target.value); setPaginaProductos(1); }}
                />
              </div>
              <table className="tabla-datos">
                <thead>
                  <tr>
                    <th>#</th><th>Producto</th><th>Unidades {anio}</th>
                    <th>Participación</th><th>Stock actual</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {productosPaginados.map((prod, idx) => {
                    const esEstrella = prod.producto_id === productos[0]?.producto_id && prod.total_unidades > 0;
                    return (
                      <tr
                        key={prod.producto_id}
                        className={prod.producto_id === productoSeleccionado ? 'fila-activa' : ''}
                      >
                        <td>{(paginaProductos - 1) * productosPorPagina + idx + 1}</td>
                        <td>{prod.producto} {esEstrella && '⭐'}</td>
                        <td>{prod.total_unidades}</td>
                        <td>{prod.participacion_pct}%</td>
                        <td>{prod.stock_actual} uds</td>
                        <td><button onClick={() => seleccionarProducto(prod.producto_id)}>Seleccionar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalPaginas > 1 && (
                <div className="paginacion">
                  <button disabled={paginaProductos === 1} onClick={() => setPaginaProductos(p => p - 1)}>◀ Anterior</button>
                  <span>Página {paginaProductos} de {totalPaginas}</span>
                  <button disabled={paginaProductos === totalPaginas} onClick={() => setPaginaProductos(p => p + 1)}>Siguiente ▶</button>
                </div>
              )}
            </section>
          )}

          {/* HISTÓRICO + KPIs + GRÁFICA */}
          {estadisticas && (
            <section>
              <div className="seccion-header">
                <h2>📊 {productoNombre}</h2>
                <SelectorGrafica valor={tipoProd} onChange={setTipoProd} />
              </div>

              {anioIncompleto && (
                <div className="alerta alerta-amarillo" style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
                  ⚠️ Datos parciales — Q₀ = {estadisticas.q0} uds ({MESES_NOMBRES[mesInicio]}) |
                  QT = {estadisticas.qT} uds ({MESES_NOMBRES[ultimoMesActivo]}) |
                  T = {ultimoMesActivo - mesInicio} meses |
                  k = {estadisticas.k_pct}% mensual
                </div>
              )}

              <div className="kpis">
                <div>📦 Total periodo: <strong>{estadisticas.total_anual} uds</strong></div>
                <div>📈 Promedio mensual: <strong>{estadisticas.promedio_mensual} uds</strong></div>
                <div>📅 Meses con ventas: <strong>{estadisticas.meses_con_ventas}</strong></div>
                <div>⚡ Tasa k: <strong>{estadisticas.k_pct}% mensual</strong></div>
                <div>📐 Q₀ = <strong>{estadisticas.q0}</strong> | QT = <strong>{estadisticas.qT}</strong></div>
                <div>📉 Mín: <strong>{estadisticas.min}</strong> | Máx: <strong>{estadisticas.max}</strong></div>
              </div>

              <div className="grafica-container">
                {tipoProd === 'line'
                  ? <Line key={`prod-line-${graficaKey}`} data={prodLineData} options={commonOptions} />
                  : <Bar  key={`prod-bar-${graficaKey}`}  data={prodBarData}  options={commonOptions} />
                }
              </div>
            </section>
          )}

          {/* PROYECCIÓN */}
          {resumen && proyeccion.length > 0 && (
            <section>
              <h2>📆 Proyección — próximos {mesesProyeccion} meses</h2>
              <div className={`alerta alerta-${resumen.semaforo}`}>
                {resumen.semaforo === 'verde'    && '🟢 Stock suficiente para el período proyectado'}
                {resumen.semaforo === 'amarillo' && '🟡 Stock en riesgo — considera reabastecerte pronto'}
                {resumen.semaforo === 'rojo'     && '🔴 Alerta de desabasto — pedido urgente necesario'}
              </div>
              <div className="resumen-grid">
                <div>Stock actual: <strong>{resumen.stock_actual} uds</strong></div>
                <div>Stock necesario ({mesesProyeccion} meses): <strong>{resumen.stock_necesario_semestre} uds</strong></div>
                <div>Déficit proyectado: <strong>{resumen.deficit_proyectado} uds</strong></div>
                <div>Agotamiento estimado: <strong>{resumen.fecha_agotamiento ?? 'No se agota en el período'}</strong></div>
                <div>Fecha límite de pedido: <strong>{resumen.fecha_limite_pedido ?? '—'}</strong></div>
              </div>
              <table className="tabla-datos">
                <thead>
                  <tr>
                    <th>Mes</th><th>Demanda proyectada</th>
                    <th>Stock acumulado necesario</th><th>Stock restante</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {proyeccion.map((p: any) => {
                    const estado = p.stock_restante <= 0 ? 'rojo'
                      : p.stock_restante < p.demanda_proyectada * 2 ? 'amarillo' : 'verde';
                    return (
                      <tr key={p.t}>
                        <td>{p.mes}</td>
                        <td><strong>{p.demanda_proyectada}</strong> uds</td>
                        <td>{p.stock_acumulado_necesario} uds</td>
                        <td className={estado}>{p.stock_restante} uds</td>
                        <td>{estado === 'verde' ? '✓ OK' : estado === 'amarillo' ? '⚠ Riesgo' : '✗ Desabasto'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="nota-matematica">
                ℹ️ Modelo: dQ/dt = k·Q → Q(t) = Q₀·e^(kt) |
                k = {estadisticas?.k} mensual |
                Stock necesario = (Q₀/k)·(e^(kT)−1) |
                Lead time fijo: 7 días
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}