// Ruta: Frontend/src/screens/trabajador/DashboardTrabajadorScreen.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { carritoAPI } from "../../services/api";
import "./DashboardTrabajadorScreen.css";

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

                // Pedidos sin asignar y pendientes
                const sinAsignar = todos.filter((p: any) =>
                    p.estado === 'pendiente' && !p.trabajador_id
                ).length;

                // Mis pedidos activos (asignados a mí, no terminados)
                const misPend = todos.filter((p: any) =>
                    p.trabajador_id === miId &&
                    !['entregado','cancelado'].includes(p.estado)
                ).length;

                // Procesados por mí este mes
                const ahora    = new Date();
                const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
                const procesados = todos.filter((p: any) =>
                    p.trabajador_id === miId &&
                    new Date(p.fecha_creacion) >= inicioMes
                ).length;

                // Entregados por mí en total
                const entregados = todos.filter((p: any) =>
                    p.trabajador_id === miId && p.estado === 'entregado'
                ).length;

                setStats({ pendientes: sinAsignar, misPendientes: misPend, procesados, entregados });

                // Últimos 3 pedidos asignados a mí
                const mios = todos
                    .filter((p: any) => p.trabajador_id === miId)
                    .slice(0, 3);
                setPedidosRecientes(mios);

            } catch (err) {
                console.error('Error cargando stats:', err);
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [user?.dbId]);

    const ESTADO_COLOR: Record<string, string> = {
        pendiente:  '#f5c842',
        confirmado: '#6bcb77',
        en_proceso: '#4d96ff',
        listo:      '#c77dff',
        enviado:    '#f5d8e8',
        entregado:  '#ecb2c3',
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

    const formatFecha = (f: string) =>
        new Date(f).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            timeZone: 'America/Mexico_City'
        });

    return (
        <div className="dashboard-container">

            {/* Header */}
            <div className="welcome-header">
                <h2>
                    Bienvenido, <span className="accent-name">{user?.nombre?.split(' ')[0] || "Trabajador"}</span>
                </h2>
                <p>Aquí tienes el resumen de tu actividad y métricas clave.</p>
            </div>

            {/* Tarjetas */}
            <div className="dashboard-cards">
                <div className="dashboard-card">
                    <h4><i className="fas fa-shopping-bag"></i> Pedidos Procesados</h4>
                    <div className="stat-number">{loading ? '…' : stats.procesados}</div>
                    <div className="stat-label">Este mes (asignados a ti)</div>
                    <div className="stat-change" style={{ color: '#ECB2C3' }}>
                        <i className="fas fa-check-circle"></i> {loading ? '…' : stats.entregados} entregados en total
                    </div>
                </div>

                <div className="dashboard-card">
                    <h4><i className="fas fa-clock"></i> Mis Pedidos Activos</h4>
                    <div className="stat-number">{loading ? '…' : stats.misPendientes}</div>
                    <div className="stat-label">En proceso ahora</div>
                    <div className="stat-change" style={{ color: stats.pendientes > 0 ? '#f5c842' : '#6bcb77' }}>
                        {loading ? '…' : stats.pendientes > 0
                            ? <><i className="fas fa-exclamation-circle"></i> {stats.pendientes} sin asignar disponibles</>
                            : <><i className="fas fa-check"></i> Sin pedidos pendientes</>
                        }
                    </div>
                </div>

                <div className="dashboard-card">
                    <h4><i className="fas fa-star"></i> Mi Desempeño</h4>
                    <div className="stat-number">
                        {loading ? '…' : stats.entregados}
                        <span style={{ fontSize: '1rem', color: '#D4B5C8' }}> entregados</span>
                    </div>
                    <div className="stat-label">Pedidos completados</div>
                    <div className="stat-change">
                        <Link to="/trabajador/actividades" style={{ color: '#ECB2C3', textDecoration: 'none', fontWeight: 600 }}>
                            Ver mis actividades →
                        </Link>
                    </div>
                </div>
            </div>

            {/* Mis pedidos recientes */}
            {pedidosRecientes.length > 0 && (
                <div className="quick-actions-box" style={{ marginBottom: '1.5rem' }}>
                    <h4><i className="fas fa-list"></i> Mis últimos pedidos asignados</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(236,178,195,0.15)' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', color: '#8a7a82', textTransform: 'uppercase' }}>Folio</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', color: '#8a7a82', textTransform: 'uppercase' }}>Cliente</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', color: '#8a7a82', textTransform: 'uppercase' }}>Fecha</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', color: '#8a7a82', textTransform: 'uppercase' }}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pedidosRecientes.map((p: any) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid rgba(236,178,195,0.06)' }}>
                                    <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.82rem', color: '#ecb2c3', fontFamily: 'monospace' }}>{p.folio}</td>
                                    <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.82rem', color: '#f0e6ea' }}>{p.cliente_nombre_completo}</td>
                                    <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.78rem', color: '#8a7a82' }}>{formatFecha(p.fecha_creacion)}</td>
                                    <td style={{ padding: '0.65rem 0.5rem' }}>
                                        <span style={{
                                            background: ESTADO_COLOR[p.estado] || '#555',
                                            color: '#0f0f12', borderRadius: '12px',
                                            padding: '0.2rem 0.65rem', fontSize: '0.7rem', fontWeight: 700
                                        }}>
                                            {ESTADO_LABEL[p.estado] || p.estado}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ textAlign: 'right', marginTop: '0.75rem' }}>
                        <Link to="/pedidos-admin" style={{ fontSize: '0.8rem', color: '#ecb2c3', textDecoration: 'none' }}>
                            Ver todos →
                        </Link>
                    </div>
                </div>
            )}

            {/* Acciones rápidas */}
            <div className="quick-actions-box">
                <h4><i className="fas fa-bolt"></i> Acciones Rápidas</h4>
                <div className="quick-actions-grid">
                    <Link to="/trabajador/actividades" className="quick-action-btn">
                        ✅ Mis Actividades
                    </Link>
                    <Link to="/pedidos-admin" className="quick-action-btn">
                        📦 Gestionar Pedidos
                        {stats.pendientes > 0 && (
                            <span style={{
                                background: '#f5c842', color: '#0f0f12',
                                borderRadius: '50%', fontSize: '0.65rem',
                                fontWeight: 800, padding: '0.1rem 0.45rem',
                                marginLeft: '0.5rem'
                            }}>{stats.pendientes}</span>
                        )}
                    </Link>
                    <Link to="/trabajador/perfil" className="quick-action-btn">
                        👤 Mi Perfil
                    </Link>
                    <Link to="/trabajador/configuracion" className="quick-action-btn">
                        ⚙️ Ajustes
                    </Link>
                </div>
            </div>
        </div>
    );
}