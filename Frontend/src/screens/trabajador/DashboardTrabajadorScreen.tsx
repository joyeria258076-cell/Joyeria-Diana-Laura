// Ruta: Frontend/src/screens/trabajador/DashboardTrabajadorScreen.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { carritoAPI } from "../../services/api";
import {
    AiOutlineShoppingCart, AiOutlineCheckCircle, AiOutlineClockCircle, AiOutlineExclamationCircle,
    AiOutlineStar, AiOutlineThunderbolt, AiOutlineUser, AiOutlineSetting, AiOutlineArrowRight,
} from "react-icons/ai";
import "./DashboardTrabajadorScreen.css";

const ESTADO_COLOR: Record<string, string> = {
    pendiente:  '#e8d5b7',
    confirmado: '#6bcb77',
    en_proceso: '#4d96ff',
    listo:      '#c77dff',
    enviado:    '#f4c2c2',
    entregado:  '#c9956c',
    cancelado:  '#e05a6a',
};

const ESTADO_LABEL: Record<string, string> = {
    pendiente:  'Pendiente',
    confirmado: 'Confirmado',
    en_proceso: 'En proceso',
    listo:      'Listo',
    enviado:    'Enviado',
    entregado:  'Entregado',
    cancelado:  'Cancelado',
};

export default function DashboardTrabajadorScreen() {
    const { user } = useAuth();

    const [stats, setStats] = useState({
        pendientes:    0,  // sin asignar
        misPendientes: 0,  // asignados a mí sin terminar
        procesados:    0,  // completados por mí este mes
        entregados:    0,  // entregados por mí
    });
    const [loading, setLoading] = useState(true);
    const [pedidosRecientes, setPedidosRecientes] = useState<any[]>([]);

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            try {
                const data = await carritoAPI.getAllPedidos();
                if (!data.success) return;
                const todos = data.data || [];
                const miId  = user?.dbId;

                const sinAsignar = todos.filter((p: any) =>
                    p.estado === 'pendiente' && !p.trabajador_id
                ).length;

                const misPend = todos.filter((p: any) =>
                    p.trabajador_id === miId &&
                    !['entregado','cancelado'].includes(p.estado)
                ).length;

                const ahora    = new Date();
                const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
                const procesados = todos.filter((p: any) =>
                    p.trabajador_id === miId &&
                    new Date(p.fecha_creacion) >= inicioMes
                ).length;

                const entregados = todos.filter((p: any) =>
                    p.trabajador_id === miId && p.estado === 'entregado'
                ).length;

                setStats({ pendientes: sinAsignar, misPendientes: misPend, procesados, entregados });

                const mios = todos
                    .filter((p: any) => p.trabajador_id === miId)
                    .slice(0, 4);
                setPedidosRecientes(mios);

            } catch (err) {
                console.error('Error cargando stats:', err);
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [user?.dbId]);

    const formatFecha = (f: string) =>
        new Date(f).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
            timeZone: 'America/Mexico_City'
        });

    const hoyStr = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="tr1-wrap">

            {/* ── Banner de bienvenida ── */}
            <section className="tr1-hero">
                <div className="tr1-hero-texto">
                    <h1 className="tr1-titulo">Hola, {user?.nombre?.split(' ')[0] || "Trabajador"}</h1>
                    <p className="tr1-subtitulo">Resumen de tu actividad hoy, {hoyStr}</p>
                </div>
                <div className="tr1-hero-mini">
                    <div className="tr1-hero-mini-item">
                        <span>{loading ? '—' : stats.misPendientes}</span>
                        <small>Activos</small>
                    </div>
                    <div className="tr1-hero-mini-sep" />
                    <div className="tr1-hero-mini-item">
                        <span>{loading ? '—' : stats.procesados}</span>
                        <small>Este mes</small>
                    </div>
                    <div className="tr1-hero-mini-sep" />
                    <div className="tr1-hero-mini-item">
                        <span>{loading ? '—' : stats.entregados}</span>
                        <small>Entregados</small>
                    </div>
                </div>
            </section>

            <div className="tr1-layout">
                {/* ── Columna principal: timeline de pedidos ── */}
                <div className="tr1-main">
                    <div className="tr1-panel">
                        <div className="tr1-panel-head">
                            <h3>Mis últimos pedidos asignados</h3>
                            <Link to="/pedidos-admin" className="tr1-panel-link">Ver todos <AiOutlineArrowRight size={12} /></Link>
                        </div>

                        {pedidosRecientes.length > 0 ? (
                            <div className="tr1-timeline">
                                {pedidosRecientes.map((p: any) => (
                                    <Link to="/pedidos-admin" key={p.id} className="tr1-timeline-row">
                                        <span
                                            className="tr1-timeline-dot"
                                            style={{ background: ESTADO_COLOR[p.estado] || '#888' }}
                                        />
                                        <div className="tr1-timeline-info">
                                            <span className="tr1-timeline-folio">{p.folio}</span>
                                            <span className="tr1-timeline-cliente">{p.cliente_nombre_completo}</span>
                                        </div>
                                        <span className="tr1-timeline-fecha">{formatFecha(p.fecha_creacion)}</span>
                                        <span
                                            className="tr1-timeline-estado"
                                            style={{ background: `${ESTADO_COLOR[p.estado] || '#888'}22`, color: ESTADO_COLOR[p.estado] || '#888', border: `1px solid ${ESTADO_COLOR[p.estado] || '#888'}44` }}
                                        >
                                            {ESTADO_LABEL[p.estado] || p.estado}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="tr1-empty">
                                {loading ? 'Cargando...' : 'Aún no tienes pedidos asignados.'}
                            </p>
                        )}
                    </div>

                    <div className="tr1-panel">
                        <div className="tr1-panel-head">
                            <h3><AiOutlineThunderbolt size={16} /> Acciones rápidas</h3>
                        </div>
                        <div className="tr1-quick-list">
                            <Link to="/trabajador/actividades" className="tr1-quick-item">
                                <AiOutlineCheckCircle size={16} /> Mis actividades
                            </Link>
                            <Link to="/pedidos-admin" className="tr1-quick-item">
                                <AiOutlineShoppingCart size={16} /> Gestionar pedidos
                                {stats.pendientes > 0 && <span className="tr1-quick-badge">{stats.pendientes}</span>}
                            </Link>
                            <Link to="/trabajador/perfil" className="tr1-quick-item">
                                <AiOutlineUser size={16} /> Mi perfil
                            </Link>
                            <Link to="/configuracion" className="tr1-quick-item">
                                <AiOutlineSetting size={16} /> Ajustes
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── Barra lateral: estadísticas ── */}
                <aside className="tr1-side">
                    <div className="tr1-stat-card">
                        <div className="tr1-stat-icon"><AiOutlineShoppingCart size={18} /></div>
                        <div>
                            <span className="tr1-stat-val">{loading ? '—' : stats.procesados}</span>
                            <span className="tr1-stat-label">Pedidos procesados este mes</span>
                        </div>
                    </div>

                    <div className="tr1-stat-card">
                        <div className="tr1-stat-icon"><AiOutlineClockCircle size={18} /></div>
                        <div>
                            <span className="tr1-stat-val">{loading ? '—' : stats.misPendientes}</span>
                            <span className="tr1-stat-label">En proceso ahora</span>
                        </div>
                        <p className="tr1-stat-nota">
                            {loading ? '' : stats.pendientes > 0
                                ? <><AiOutlineExclamationCircle size={12} /> {stats.pendientes} sin asignar disponibles</>
                                : <><AiOutlineCheckCircle size={12} /> Sin pedidos pendientes</>
                            }
                        </p>
                    </div>

                    <div className="tr1-stat-card">
                        <div className="tr1-stat-icon tr1-stat-icon--gold"><AiOutlineStar size={18} /></div>
                        <div>
                            <span className="tr1-stat-val">{loading ? '—' : stats.entregados}</span>
                            <span className="tr1-stat-label">Pedidos entregados en total</span>
                        </div>
                        <Link to="/trabajador/actividades" className="tr1-stat-link">Ver mis actividades →</Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
