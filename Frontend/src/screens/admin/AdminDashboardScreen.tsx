import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Tooltip, Filler,
} from 'chart.js';
import { solicitudesAPI, reportesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
    AiOutlineDollarCircle, AiOutlineTrophy, AiOutlineBell, AiOutlineKey,
    AiOutlineEdit, AiOutlineInbox, AiOutlineShoppingCart, AiOutlineTeam,
    AiOutlineLineChart, AiOutlineBulb, AiOutlineUsergroupAdd,
    AiOutlineWarning, AiOutlineCheckCircle, AiOutlineCrown, AiOutlineStar,
    AiOutlinePieChart, AiOutlinePlusCircle, AiOutlineTag, AiOutlineFileText, AiOutlineBgColors,
} from 'react-icons/ai';
import './AdminDashboardScreen.css';
import './DashboardAdminApp.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const money = (n: number | string) =>
    `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

const AdminDashboardScreen: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
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
            borderColor: 'rgba(255,255,255,0.95)',
            backgroundColor: 'rgba(255,255,255,0.18)',
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

    // "Pedidos" antes llevaba a /pedidos-admin (solo trabajador → 403); el admin monitorea.
    const ACCIONES = [
        { label: 'Nuevo producto', desc: 'Da de alta una pieza', icon: AiOutlinePlusCircle, ruta: '/admin-nuevo-producto' },
        { label: 'Inventario', desc: 'Stock y precios', icon: AiOutlineInbox, ruta: '/admin-inventario' },
        { label: 'Pedidos', desc: 'Monitoreo de la operación', icon: AiOutlineShoppingCart, ruta: '/admin/monitoreo-operacion' },
        { label: 'Promociones', desc: 'Descuentos activos', icon: AiOutlineTag, ruta: '/admin/promociones' },
        { label: 'Personal', desc: 'Trabajadores', icon: AiOutlineTeam, ruta: '/admin-trabajadores' },
        { label: 'Contenido', desc: 'Inicio, noticias y más', icon: AiOutlineFileText, ruta: '/admin-contenido' },
        { label: 'Temáticas', desc: 'Estilos de temporada', icon: AiOutlineBgColors, ruta: '/admin/tematicas' },
        { label: 'Reportes', desc: 'Ventas y desempeño', icon: AiOutlineLineChart, ruta: '/admin-reportes' },
    ];
    const HERRAMIENTAS = [
        { label: 'Precio sugerido', desc: 'Calcula el precio ideal de una pieza', icon: AiOutlineDollarCircle, ruta: '/admin-nuevo-producto' },
        { label: 'Segmentos de clientes', desc: 'Grupos y promociones dirigidas', icon: AiOutlineUsergroupAdd, ruta: '/admin-segmentos' },
    ];

    const nombre = (user?.nombre || 'Admin').split(' ')[0];
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
    const stockBajo = Number(inventario?.resumen?.productos_stock_bajo) || 0;
    const COLOR_ESTADO: Record<string, string> = {
        pendiente: 'var(--color-warning)', confirmado: 'var(--color-info)', en_preparacion: 'var(--color-primary)',
        enviado: 'var(--color-accent)', entregado: 'var(--color-success)', cancelado: 'var(--color-error)', expirado: 'var(--color-text-muted)',
    };
    const etiquetaEstado = (e: string) => e.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

    return (
        <div className="dc-wrap da">
            {/* ── Portada ── */}
            <section className="da-hero">
                <div className="da-hero-textos">
                    <span className="da-hero-fecha">{hoyStr}</span>
                    <h1 className="da-hero-titulo">{saludo}, <em>{nombre}</em></h1>
                    <p className="da-hero-sub">Así va tu joyería en los últimos 30 días.</p>
                    <div className="da-hero-ingresos">
                        <span>Ingresos</span>
                        <strong>{loadingR ? '—' : money(ventas?.resumen?.ingresos_totales)}</strong>
                    </div>
                    <div className="da-hero-chips">
                        <span><b>{loadingR ? '—' : ventas?.resumen?.total_ventas ?? 0}</b> ventas</span>
                        <span>Ticket promedio <b>{loadingR ? '—' : money(ventas?.resumen?.ticket_promedio)}</b></span>
                    </div>
                </div>
                <div className="da-hero-grafica">
                    {!loadingR && serie.length > 1
                        ? <Line data={sparkData} options={sparkOptions} />
                        : <p className="da-hero-sin">{loadingR ? 'Cargando…' : 'La gráfica aparece cuando haya ventas.'}</p>}
                </div>
            </section>

            {/* ── Indicadores ── */}
            <section className="da-kpis">
                <button className="da-kpi da-kpi--info" onClick={() => navigate('/admin-inventario')}>
                    <span className="da-kpi-icono"><AiOutlineInbox size={20} /></span>
                    <span className="da-kpi-val">{loadingR ? '—' : money(inventario?.resumen?.valor_inventario)}</span>
                    <span className="da-kpi-label">Valor del inventario</span>
                </button>
                <button className={`da-kpi da-kpi--warning${stockBajo > 0 ? ' da-kpi--alerta' : ''}`} onClick={() => navigate('/admin-reportes')}>
                    <span className="da-kpi-icono"><AiOutlineWarning size={20} /></span>
                    <span className="da-kpi-val">{loadingR ? '—' : stockBajo}</span>
                    <span className="da-kpi-label">Productos con stock bajo</span>
                </button>
                <button className={`da-kpi da-kpi--primary${pendientes.length > 0 ? ' da-kpi--alerta' : ''}`} onClick={() => navigate('/admin-perfil')}>
                    <span className="da-kpi-icono"><AiOutlineBell size={20} /></span>
                    <span className="da-kpi-val">{loadingS ? '—' : pendientes.length}</span>
                    <span className="da-kpi-label">
                        Solicitudes del personal
                        {recuperaciones.length > 0 && <small><AiOutlineKey size={11} /> {recuperaciones.length} código{recuperaciones.length !== 1 ? 's' : ''}</small>}
                        {cambiosNombre.length > 0 && <small><AiOutlineEdit size={11} /> {cambiosNombre.length} nombre{cambiosNombre.length !== 1 ? 's' : ''}</small>}
                    </span>
                </button>
                <button className="da-kpi da-kpi--success" onClick={() => navigate('/admin/monitoreo-operacion')}>
                    <span className="da-kpi-icono"><AiOutlineShoppingCart size={20} /></span>
                    <span className="da-kpi-val">{loadingR ? '—' : porEstado.filter((e: any) => !['entregado', 'cancelado', 'expirado'].includes(e.estado)).reduce((s: number, e: any) => s + Number(e.total), 0)}</span>
                    <span className="da-kpi-label">Pedidos en curso</span>
                </button>
            </section>

            {/* ── Ranking + estados ── */}
            <section className="da-dos">
                <div className="da-panel">
                    <div className="da-panel-head">
                        <h3><AiOutlineTrophy size={17} /> Lo más vendido</h3>
                        <button onClick={() => navigate('/admin-reportes')}>Ver reportes</button>
                    </div>
                    {loadingR ? <p className="da-vacio">Cargando…</p> : productos?.top?.length ? (
                        <ol className="da-ranking">
                            {productos.top.map((p: any, i: number) => (
                                <li key={p.producto_id}>
                                    <span className={`da-medalla da-medalla--${i}`}>{i + 1}</span>
                                    <span className="da-ranking-nombre">{p.producto_nombre}</span>
                                    <span className="da-ranking-val">{p.unidades_vendidas} u.</span>
                                </li>
                            ))}
                        </ol>
                    ) : <p className="da-vacio">Aún no hay ventas en los últimos 30 días.</p>}
                </div>
                <div className="da-panel">
                    <div className="da-panel-head">
                        <h3><AiOutlinePieChart size={17} /> Pedidos por estado</h3>
                        <button onClick={() => navigate('/admin/monitoreo-operacion')}>Monitorear</button>
                    </div>
                    {loadingR ? <p className="da-vacio">Cargando…</p> : porEstado.length ? (
                        <div className="da-estados">
                            {porEstado.map((e: any) => (
                                <div key={e.estado} className="da-estado">
                                    <span className="da-estado-label"><i style={{ background: COLOR_ESTADO[e.estado] || 'var(--color-primary)' }} />{etiquetaEstado(e.estado)}</span>
                                    <div className="da-estado-barra"><div style={{ width: `${maxEstado ? (e.total / maxEstado) * 100 : 0}%`, background: COLOR_ESTADO[e.estado] || 'var(--color-primary)' }} /></div>
                                    <span className="da-estado-val">{e.total}</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="da-vacio">Sin pedidos en este periodo.</p>}
                </div>
            </section>

            {/* ── Personas destacadas ── */}
            <section className="da-personas">
                <div className="da-persona">
                    <span className="da-persona-avatar">{mejorCliente ? String(mejorCliente.nombre || '?').charAt(0).toUpperCase() : <AiOutlineStar size={20} />}</span>
                    <div>
                        <span className="da-persona-label">Mejor cliente del mes</span>
                        <strong>{loadingR ? 'Cargando…' : mejorCliente ? `${mejorCliente.nombre} ${mejorCliente.apellido || ''}` : 'Sin datos todavía'}</strong>
                        {mejorCliente && <small>{money(mejorCliente.gasto_total)} en compras</small>}
                    </div>
                </div>
                <div className="da-persona da-persona--dorado" onClick={() => navigate('/admin-reportes')} role="button" tabIndex={0}>
                    <span className="da-persona-avatar"><AiOutlineCrown size={20} /></span>
                    <div>
                        <span className="da-persona-label">Trabajador destacado</span>
                        <strong>{loadingR ? 'Cargando…' : mejorTrabajador ? mejorTrabajador.nombre : 'Sin actividad todavía'}</strong>
                        {mejorTrabajador && <small>{Number(mejorTrabajador.ventas_gestionadas) + Number(mejorTrabajador.apartados_gestionados) + Number(mejorTrabajador.abonos_registrados)} gestiones</small>}
                    </div>
                </div>
            </section>

            {/* ── Accesos rápidos ── */}
            <section>
                <span className="da-eyebrow">Accesos rápidos</span>
                <div className="da-accesos">
                    {ACCIONES.map(a => (
                        <button key={a.label} className="da-acceso" onClick={() => navigate(a.ruta)}>
                            <span className="da-acceso-icono"><a.icon size={20} /></span>
                            <strong>{a.label}</strong>
                            <small>{a.desc}</small>
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <span className="da-eyebrow"><AiOutlineBulb size={13} /> Herramientas inteligentes</span>
                <div className="da-accesos da-accesos--ia">
                    {HERRAMIENTAS.map(a => (
                        <button key={a.label} className="da-acceso da-acceso--ia" onClick={() => navigate(a.ruta)}>
                            <span className="da-acceso-icono"><a.icon size={20} /></span>
                            <strong>{a.label}</strong>
                            <small>{a.desc}</small>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default AdminDashboardScreen;
