import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Tooltip, Filler,
} from 'chart.js';
import { solicitudesAPI, reportesAPI } from '../../services/api';
import {
    AiOutlineDollarCircle, AiOutlineTrophy, AiOutlineBell, AiOutlineKey,
    AiOutlineEdit, AiOutlineInbox, AiOutlineShoppingCart, AiOutlineTeam,
    AiOutlineLineChart, AiOutlineBulb, AiOutlineUsergroupAdd,
    AiOutlineWarning, AiOutlineCheckCircle, AiOutlineCrown, AiOutlineStar,
    AiOutlinePieChart,
} from 'react-icons/ai';
import './AdminDashboardScreen.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const money = (n: number | string) =>
    `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const AdminDashboardScreen: React.FC = () => {
    const navigate = useNavigate();
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [loadingS, setLoadingS] = useState(true);

    const [ventas, setVentas] = useState<any>(null);
    const [productos, setProductos] = useState<any>(null);
    const [inventario, setInventario] = useState<any>(null);
    const [trabajadores, setTrabajadores] = useState<any>(null);
    const [loadingR, setLoadingR] = useState(true);

    const cargarSolicitudes = useCallback(async () => {
        try {
            const res = await solicitudesAPI.getTodas();
            if (res.success) setSolicitudes(res.data || []);
        } catch { /**/ }
        finally { setLoadingS(false); }
    }, []);

    const cargarReportes = useCallback(async () => {
        try {
            const [v, p, inv, t] = await Promise.all([
                reportesAPI.getVentas(30),
                reportesAPI.getProductos(30, 3),
                reportesAPI.getInventario(),
                reportesAPI.getTrabajadores(30),
            ]);
            setVentas(v);
            setProductos(p);
            setInventario(inv);
            setTrabajadores(t);
        } catch { /**/ }
        finally { setLoadingR(false); }
    }, []);

    useEffect(() => { cargarSolicitudes(); cargarReportes(); }, [cargarSolicitudes, cargarReportes]);

    const pendientes     = solicitudes.filter(s => s.estado === 'pendiente');
    const recuperaciones = pendientes.filter(s => s.campo === 'recuperar_codigo');
    const cambiosNombre  = pendientes.filter(s => s.campo === 'nombre');
    const medallas = ['dc-medal--oro', 'dc-medal--plata', 'dc-medal--bronce'];

    const hoyStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    const serie = ventas?.serie || [];
    const sparkData = {
        labels: serie.map((d: any) => d.dia),
        datasets: [{
            data: serie.map((d: any) => Number(d.ingresos)),
            borderColor: '#c9956c',
            backgroundColor: 'rgba(201,149,108,0.18)',
            fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
        }],
    };
    const sparkOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
    };

    const mejorCliente = ventas?.topClientes?.[0] || null;
    const mejorTrabajador = trabajadores?.trabajadores?.[0] || null;
    const porEstado = ventas?.porEstado || [];
    const maxEstado = porEstado.length ? Math.max(...porEstado.map((e: any) => Number(e.total))) : 0;

    const ACCIONES = [
        { label: 'Inventario', icon: AiOutlineInbox, ruta: '/admin-inventario' },
        { label: 'Pedidos', icon: AiOutlineShoppingCart, ruta: '/pedidos-admin' },
        { label: 'Personal', icon: AiOutlineTeam, ruta: '/admin-trabajadores' },
        { label: 'Reportes', icon: AiOutlineLineChart, ruta: '/admin-reportes' },
    ];
    const HERRAMIENTAS = [
        { label: 'Precio sugerido', icon: AiOutlineDollarCircle, ruta: '/admin-nuevo-producto' },
        { label: 'Segmentos', icon: AiOutlineUsergroupAdd, ruta: '/admin-segmentos' },
    ];

    return (
        <div className="dc-wrap animate-in">
            <div className="dc-header">
                <h1 className="dc-titulo"><AiOutlineLineChart size={22} /> Dashboard Informativo</h1>
                <p className="dc-subtitulo">Resumen de tu negocio hoy, {hoyStr}</p>
            </div>

            <div className="dc-bento">
                {/* ── Bloque hero de ingresos con sparkline ── */}
                <div className="dc-tile dc-tile--hero">
                    <div className="dc-hero-texto">
                        <span className="dc-hero-label"><AiOutlineDollarCircle size={14} /> Ingresos últimos 30 días</span>
                        <span className="dc-hero-val">{loadingR ? '—' : money(ventas?.resumen?.ingresos_totales)}</span>
                        <div className="dc-hero-mini">
                            <span><strong>{loadingR ? '—' : ventas?.resumen?.total_ventas ?? 0}</strong> ventas</span>
                            <span className="dc-hero-mini-sep">·</span>
                            <span>promedio por venta: <strong>{loadingR ? '—' : money(ventas?.resumen?.ticket_promedio)}</strong></span>
                        </div>
                    </div>
                    {!loadingR && serie.length > 1 && (
                        <div className="dc-hero-spark"><Line data={sparkData} options={sparkOptions} /></div>
                    )}
                </div>

                <div className="dc-tile dc-tile--mini">
                    <span className="dc-mini-label">Valor de inventario</span>
                    <span className="dc-mini-val">{loadingR ? '—' : money(inventario?.resumen?.valor_inventario)}</span>
                </div>

                <div className={`dc-tile dc-tile--mini${Number(inventario?.resumen?.productos_stock_bajo) > 0 ? ' dc-tile--warn' : ''}`}
                    onClick={() => navigate('/admin-reportes')} role="button" tabIndex={0}>
                    <span className="dc-mini-label"><AiOutlineWarning size={13} /> Stock bajo</span>
                    <span className="dc-mini-val">{loadingR ? '—' : inventario?.resumen?.productos_stock_bajo ?? 0}</span>
                </div>

                {/* ── Ranking de productos ── */}
                <div className="dc-tile dc-tile--ranking">
                    <div className="dc-tile-head">
                        <h3><AiOutlineTrophy size={16} /> Productos más vendidos</h3>
                        <button className="dc-tile-link" onClick={() => navigate('/admin-reportes')}>Ver todos</button>
                    </div>
                    {loadingR ? (
                        <p className="dc-empty">Cargando...</p>
                    ) : productos?.top?.length ? (
                        <div className="dc-podio">
                            {productos.top.map((p: any, i: number) => (
                                <div key={p.producto_id} className="dc-podio-row">
                                    <span className={`dc-medal ${medallas[i] || ''}`}>{i + 1}</span>
                                    <span className="dc-podio-nombre">{p.producto_nombre}</span>
                                    <span className="dc-podio-val">{p.unidades_vendidas} ventas</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="dc-empty">Sin ventas registradas en los últimos 30 días.</p>
                    )}
                </div>

                {/* ── Solicitudes de personal ── */}
                <div className={`dc-tile dc-tile--alert${pendientes.length > 0 ? ' dc-tile--activo' : ''}`}
                    onClick={() => navigate('/admin-perfil')} role="button" tabIndex={0}>
                    <div className="dc-alert-head"><AiOutlineBell size={16} /><span>Solicitudes de personal</span></div>
                    {loadingS ? (
                        <p className="dc-empty">Cargando...</p>
                    ) : pendientes.length === 0 ? (
                        <div className="dc-alert-ok"><AiOutlineCheckCircle size={16} /> Sin solicitudes pendientes</div>
                    ) : (
                        <>
                            <span className="dc-alert-num">{pendientes.length}</span>
                            <p className="dc-alert-sub">Pendiente{pendientes.length !== 1 ? 's' : ''} de revisión</p>
                            <div className="dc-alert-badges">
                                {recuperaciones.length > 0 && (
                                    <span className="dc-badge"><AiOutlineKey size={11} /> {recuperaciones.length} código{recuperaciones.length !== 1 ? 's' : ''}</span>
                                )}
                                {cambiosNombre.length > 0 && (
                                    <span className="dc-badge"><AiOutlineEdit size={11} /> {cambiosNombre.length} nombre{cambiosNombre.length !== 1 ? 's' : ''}</span>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Ventas por estado ── */}
                <div className="dc-tile dc-tile--estados">
                    <div className="dc-tile-head">
                        <h3><AiOutlinePieChart size={16} /> Ventas por estado</h3>
                    </div>
                    {loadingR ? (
                        <p className="dc-empty">Cargando...</p>
                    ) : porEstado.length ? (
                        <div className="dc-estados-list">
                            {porEstado.map((e: any) => (
                                <div key={e.estado} className="dc-estado-row">
                                    <span className="dc-estado-label">{e.estado}</span>
                                    <div className="dc-estado-track">
                                        <div className="dc-estado-fill" style={{ width: `${maxEstado ? (e.total / maxEstado) * 100 : 0}%` }} />
                                    </div>
                                    <span className="dc-estado-val">{e.total}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="dc-empty">Sin datos.</p>
                    )}
                </div>

                {/* ── Mejor cliente ── */}
                <div className="dc-tile dc-tile--persona">
                    <div className="dc-persona-icon"><AiOutlineStar size={18} /></div>
                    <span className="dc-mini-label">Mejor cliente (30 días)</span>
                    {loadingR ? (
                        <p className="dc-empty">Cargando...</p>
                    ) : mejorCliente ? (
                        <>
                            <span className="dc-persona-nombre">{mejorCliente.nombre} {mejorCliente.apellido}</span>
                            <span className="dc-persona-sub">{money(mejorCliente.gasto_total)} en compras</span>
                        </>
                    ) : (
                        <p className="dc-empty">Sin datos.</p>
                    )}
                </div>

                {/* ── Trabajador destacado ── */}
                <div className="dc-tile dc-tile--persona" onClick={() => navigate('/admin-reportes')} role="button" tabIndex={0}>
                    <div className="dc-persona-icon dc-persona-icon--gold"><AiOutlineCrown size={18} /></div>
                    <span className="dc-mini-label">Trabajador destacado</span>
                    {loadingR ? (
                        <p className="dc-empty">Cargando...</p>
                    ) : mejorTrabajador ? (
                        <>
                            <span className="dc-persona-nombre">{mejorTrabajador.nombre}</span>
                            <span className="dc-persona-sub">
                                {Number(mejorTrabajador.ventas_gestionadas) + Number(mejorTrabajador.apartados_gestionados) + Number(mejorTrabajador.abonos_registrados)} gestiones
                            </span>
                        </>
                    ) : (
                        <p className="dc-empty">Sin actividad registrada.</p>
                    )}
                </div>
            </div>

            <div className="dc-section">
                <h4 className="dc-section-titulo">Acciones rápidas</h4>
                <div className="dc-launcher">
                    {ACCIONES.map(a => (
                        <button key={a.label} className="dc-launcher-item" onClick={() => navigate(a.ruta)}>
                            <span className="dc-launcher-icon"><a.icon size={20} /></span>
                            <span>{a.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="dc-section">
                <h4 className="dc-section-titulo"><AiOutlineBulb size={16} /> Herramientas inteligentes</h4>
                <div className="dc-launcher">
                    {HERRAMIENTAS.map(a => (
                        <button key={a.label} className="dc-launcher-item dc-launcher-item--ia" onClick={() => navigate(a.ruta)}>
                            <span className="dc-launcher-icon dc-launcher-icon--ia"><a.icon size={20} /></span>
                            <span>{a.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardScreen;
