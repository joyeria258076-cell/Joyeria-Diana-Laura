import React, { useEffect, useState, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler,
} from 'chart.js';
import {
  AiOutlineBarChart, AiOutlineShoppingCart, AiOutlineTrophy,
  AiOutlineTeam, AiOutlineRise, AiOutlineDatabase, AiOutlineWarning,
} from 'react-icons/ai';
import { reportesAPI } from '../../services/api';
import './AdminReportesScreen.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

type Tab = 'ventas' | 'productos' | 'inventario' | 'trabajadores';

const money = (n: number | string) =>
  `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PERIODOS = [
  { label: '7 días', valor: 7 },
  { label: '30 días', valor: 30 },
  { label: '90 días', valor: 90 },
];

const AdminReportesScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('ventas');
  const [dias, setDias] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [ventas, setVentas] = useState<any>(null);
  const [productos, setProductos] = useState<any>(null);
  const [inventario, setInventario] = useState<any>(null);
  const [trabajadores, setTrabajadores] = useState<any>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [v, p, inv, t] = await Promise.all([
        reportesAPI.getVentas(dias),
        reportesAPI.getProductos(dias, 8),
        reportesAPI.getInventario(),
        reportesAPI.getTrabajadores(dias),
      ]);
      setVentas(v);
      setProductos(p);
      setInventario(inv);
      setTrabajadores(t);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
    }
  }, [dias]);

  useEffect(() => { cargar(); }, [cargar]);

  const serieVentas = ventas?.serie || [];
  const maxProductos = productos?.top?.length
    ? Math.max(...productos.top.map((p: any) => Number(p.unidades_vendidas)))
    : 0;
  const maxActividad = trabajadores?.trabajadores?.length
    ? Math.max(...trabajadores.trabajadores.map((w: any) =>
        Number(w.ventas_gestionadas) + Number(w.apartados_gestionados) + Number(w.abonos_registrados)))
    : 0;

  const chartData = {
    labels: serieVentas.map((d: any) =>
      new Date(d.dia).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })),
    datasets: [{
      data: serieVentas.map((d: any) => Number(d.ingresos)),
      borderColor: '#b9836a',
      backgroundColor: 'rgba(185,131,106,0.15)',
      fill: true,
      tension: 0.35,
      pointRadius: 2,
      pointBackgroundColor: '#b9836a',
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx: any) => money(ctx.parsed.y) },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9e9087', font: { size: 11 } } },
      y: {
        grid: { color: 'rgba(255,255,255,0.08)' },
        ticks: { color: '#9e9087', font: { size: 11 }, callback: (v: any) => money(v) },
      },
    },
  };

  return (
    <div className="rp-wrap animate-in">
      <div className="rp-header">
        <div>
          <h1 className="rp-titulo"><AiOutlineBarChart size={22} /> Reportes y Análisis</h1>
          <p className="rp-subtitulo">Desempeño real de ventas, productos y equipo</p>
        </div>
        <div className="rp-periodos">
          {PERIODOS.map(p => (
            <button
              key={p.valor}
              className={`rp-periodo-btn${dias === p.valor ? ' sel' : ''}`}
              onClick={() => setDias(p.valor)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rp-error">{error}</div>}

      <div className="rp-layout">
        <nav className="rp-rail">
          <button className={`rp-rail-item${tab === 'ventas' ? ' sel' : ''}`} onClick={() => setTab('ventas')}>
            <AiOutlineShoppingCart size={18} />
            <span>Ventas totales</span>
          </button>
          <button className={`rp-rail-item${tab === 'productos' ? ' sel' : ''}`} onClick={() => setTab('productos')}>
            <AiOutlineTrophy size={18} />
            <span>Productos más vendidos</span>
          </button>
          <button className={`rp-rail-item${tab === 'inventario' ? ' sel' : ''}`} onClick={() => setTab('inventario')}>
            <AiOutlineDatabase size={18} />
            <span>Inventario por categoría</span>
          </button>
          <button className={`rp-rail-item${tab === 'trabajadores' ? ' sel' : ''}`} onClick={() => setTab('trabajadores')}>
            <AiOutlineTeam size={18} />
            <span>Performance del equipo</span>
          </button>
        </nav>

        <div className="rp-panel">
          {loading && <div className="rp-loading">Cargando reporte...</div>}

          {!loading && tab === 'ventas' && ventas && (
            <div className="rp-tabpage">
              <div className="rp-stats-row">
                <div className="rp-stat">
                  <span className="rp-stat-label">Ventas realizadas</span>
                  <span className="rp-stat-val">{ventas.resumen.total_ventas}</span>
                </div>
                <div className="rp-stat">
                  <span className="rp-stat-label">Ingresos totales</span>
                  <span className="rp-stat-val">{money(ventas.resumen.ingresos_totales)}</span>
                </div>
                <div className="rp-stat">
                  <span className="rp-stat-label">Artículos vendidos</span>
                  <span className="rp-stat-val">{ventas.resumen.articulos_vendidos}</span>
                </div>
                <div className="rp-stat">
                  <span className="rp-stat-label">Ticket promedio</span>
                  <span className="rp-stat-val">{money(ventas.resumen.ticket_promedio)}</span>
                </div>
              </div>

              <div className="rp-chart-card">
                <p className="rp-chart-title"><AiOutlineRise size={16} /> Ingresos por día</p>
                {serieVentas.length > 0 ? (
                  <div className="rp-chart-box"><Line data={chartData} options={chartOptions} /></div>
                ) : (
                  <p className="rp-empty">Sin ventas registradas en este período.</p>
                )}
              </div>

              <div className="rp-cols">
                <div className="rp-chart-card">
                  <p className="rp-chart-title">Ventas por estado</p>
                  {(ventas.porEstado || []).map((e: any) => (
                    <div key={e.estado} className="rp-bar-row">
                      <span className="rp-bar-label">{e.estado}</span>
                      <div className="rp-bar-track">
                        <div className="rp-bar-fill" style={{ width: `${(e.total / ventas.resumen.total_ventas) * 100}%` }} />
                      </div>
                      <span className="rp-bar-val">{e.total}</span>
                    </div>
                  ))}
                  {(!ventas.porEstado || ventas.porEstado.length === 0) && <p className="rp-empty">Sin datos.</p>}
                </div>

                <div className="rp-chart-card">
                  <p className="rp-chart-title">Mejores clientes</p>
                  <ul className="rp-clientes-list">
                    {(ventas.topClientes || []).map((c: any, i: number) => (
                      <li key={c.id}>
                        <span className="rp-cliente-rank">{i + 1}</span>
                        <span className="rp-cliente-nombre">{c.nombre} {c.apellido}</span>
                        <span className="rp-cliente-monto">{money(c.gasto_total)}</span>
                      </li>
                    ))}
                    {(!ventas.topClientes || ventas.topClientes.length === 0) && <p className="rp-empty">Sin datos.</p>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {!loading && tab === 'productos' && productos && (
            <div className="rp-tabpage">
              <div className="rp-stats-row">
                <div className="rp-stat">
                  <span className="rp-stat-label">Productos distintos vendidos</span>
                  <span className="rp-stat-val">{productos.resumen.productos_distintos}</span>
                </div>
                <div className="rp-stat">
                  <span className="rp-stat-label">Unidades vendidas</span>
                  <span className="rp-stat-val">{productos.resumen.total_unidades}</span>
                </div>
                <div className="rp-stat">
                  <span className="rp-stat-label">Ingresos generados</span>
                  <span className="rp-stat-val">{money(productos.resumen.total_ingresos)}</span>
                </div>
              </div>

              <div className="rp-chart-card">
                <p className="rp-chart-title">Ranking por unidades vendidas</p>
                <div className="rp-leaderboard">
                  {(productos.top || []).map((p: any, i: number) => (
                    <div key={p.producto_id} className="rp-lb-row">
                      <span className="rp-lb-rank">{i + 1}</span>
                      <div className="rp-lb-info">
                        <div className="rp-lb-head">
                          <span className="rp-lb-nombre">{p.producto_nombre}</span>
                          <span className="rp-lb-unidades">{p.unidades_vendidas} uds · {money(p.ingresos_generados)}</span>
                        </div>
                        <div className="rp-bar-track">
                          <div className="rp-bar-fill" style={{ width: `${maxProductos ? (p.unidades_vendidas / maxProductos) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <span className="rp-lb-stock">Stock: {p.stock_actual ?? '—'}</span>
                    </div>
                  ))}
                  {(!productos.top || productos.top.length === 0) && <p className="rp-empty">Sin ventas registradas en este período.</p>}
                </div>
              </div>
            </div>
          )}

          {!loading && tab === 'inventario' && inventario && (
            <div className="rp-tabpage">
              <div className="rp-stats-row">
                <div className="rp-stat">
                  <span className="rp-stat-label">Productos activos</span>
                  <span className="rp-stat-val">{inventario.resumen.total_productos}</span>
                </div>
                <div className="rp-stat">
                  <span className="rp-stat-label">Piezas en stock</span>
                  <span className="rp-stat-val">{inventario.resumen.stock_total}</span>
                </div>
                <div className="rp-stat">
                  <span className="rp-stat-label">Valor del inventario</span>
                  <span className="rp-stat-val">{money(inventario.resumen.valor_inventario)}</span>
                </div>
                <div className="rp-stat rp-stat--warn">
                  <span className="rp-stat-label">Stock bajo / agotado</span>
                  <span className="rp-stat-val">{inventario.resumen.productos_stock_bajo} / {inventario.resumen.productos_agotados}</span>
                </div>
              </div>

              <div className="rp-chart-card">
                <p className="rp-chart-title">Existencias por categoría</p>
                <div className="rp-leaderboard">
                  {(inventario.porCategoria || []).map((c: any) => {
                    const maxCat = Math.max(...inventario.porCategoria.map((x: any) => Number(x.num_productos)));
                    return (
                      <div key={c.categoria} className="rp-lb-row">
                        <div className="rp-lb-info">
                          <div className="rp-lb-head">
                            <span className="rp-lb-nombre">{c.categoria}</span>
                            <span className="rp-lb-unidades">{c.num_productos} productos · {c.stock_total} piezas · {money(c.valor_inventario)}</span>
                          </div>
                          <div className="rp-bar-track">
                            <div className="rp-bar-fill" style={{ width: `${maxCat ? (c.num_productos / maxCat) * 100 : 0}%` }} />
                          </div>
                        </div>
                        {Number(c.productos_stock_bajo) > 0 && (
                          <span className="rp-lb-stock rp-lb-stock--warn">{c.productos_stock_bajo} con stock bajo</span>
                        )}
                      </div>
                    );
                  })}
                  {(!inventario.porCategoria || inventario.porCategoria.length === 0) && <p className="rp-empty">No hay categorías con productos activos.</p>}
                </div>
              </div>

              <div className="rp-chart-card">
                <p className="rp-chart-title"><AiOutlineWarning size={16} /> Productos con stock bajo</p>
                {(inventario.stockBajo || []).length > 0 ? (
                  <ul className="rp-clientes-list">
                    {inventario.stockBajo.map((p: any) => (
                      <li key={p.id}>
                        <span className="rp-cliente-nombre">{p.nombre} <small style={{ color: 'var(--color-text-muted)' }}>· {p.categoria_nombre || 'Sin categoría'}</small></span>
                        <span className="rp-cliente-monto" style={{ color: p.stock_actual === 0 ? '#d98a8a' : undefined }}>
                          {p.stock_actual} / mín. {p.stock_minimo}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rp-empty">Todo el inventario está por encima del mínimo.</p>
                )}
              </div>
            </div>
          )}

          {!loading && tab === 'trabajadores' && trabajadores && (
            <div className="rp-tabpage">
              <div className="rp-team-grid">
                {(trabajadores.trabajadores || []).map((w: any) => {
                  const actividad = Number(w.ventas_gestionadas) + Number(w.apartados_gestionados) + Number(w.abonos_registrados);
                  return (
                    <div key={w.id} className="rp-team-card">
                      <div className="rp-team-head">
                        <div className="rp-team-avatar">{(w.nombre || '?').charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="rp-team-nombre">{w.nombre}</p>
                          <p className="rp-team-rol">{w.rol}</p>
                        </div>
                      </div>
                      <div className="rp-team-metrics">
                        <div><span>{w.ventas_gestionadas}</span><small>Ventas</small></div>
                        <div><span>{w.apartados_gestionados}</span><small>Apartados</small></div>
                        <div><span>{w.abonos_registrados}</span><small>Abonos</small></div>
                      </div>
                      <div className="rp-bar-track">
                        <div className="rp-bar-fill" style={{ width: `${maxActividad ? (actividad / maxActividad) * 100 : 0}%` }} />
                      </div>
                      <p className="rp-team-monto">{money(w.monto_cobrado)} cobrados en abonos</p>
                    </div>
                  );
                })}
                {(!trabajadores.trabajadores || trabajadores.trabajadores.length === 0) && (
                  <p className="rp-empty">Sin actividad de trabajadores en este período.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReportesScreen;
