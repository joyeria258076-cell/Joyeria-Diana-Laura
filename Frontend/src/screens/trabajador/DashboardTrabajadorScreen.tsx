// Ruta: Frontend/src/screens/trabajador/DashboardTrabajadorScreen.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { carritoAPI } from "../../services/api";
import {
    AiOutlineShoppingCart, AiOutlineCheckCircle, AiOutlineClockCircle, AiOutlineExclamationCircle,
    AiOutlineStar, AiOutlineUnorderedList, AiOutlineThunderbolt, AiOutlineUser, AiOutlineSetting,
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

    const formatFecha = (f: string) =>
        new Date(f).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            timeZone: 'America/Mexico_City'
        });

    return (
        <div className="dashboard-container">

            <div className="welcome-header">
                <h2>
                    Bienvenido, <span className="accent-name">{user?.nombre?.split(' ')[0] || "Trabajador"}</span>
                </h2>
                <p>Aquí tienes el resumen de tu actividad y métricas clave.</p>
            </div>

            <div className="dashboard-cards">
                <div className="dashboard-card">
                    <h4><AiOutlineShoppingCart size={16} /> Pedidos Procesados</h4>
                    <div className="stat-number">{loading ? '…' : stats.procesados}</div>
                    <div className="stat-label">Este mes (asignados a ti)</div>
                    <div className="stat-change">
                        <AiOutlineCheckCircle size={14} /> {loading ? '…' : stats.entregados} entregados en total
                    </div>
                </div>

                <div className="dashboard-card">
                    <h4><AiOutlineClockCircle size={16} /> Mis Pedidos Activos</h4>
                    <div className="stat-number">{loading ? '…' : stats.misPendientes}</div>
                    <div className="stat-label">En proceso ahora</div>
                    <div className="stat-change">
                        {loading ? '…' : stats.pendientes > 0
                            ? <><AiOutlineExclamationCircle size={14} /> {stats.pendientes} sin asignar disponibles</>
                            : <><AiOutlineCheckCircle size={14} /> Sin pedidos pendientes</>
                        }
                    </div>
                </div>

                <div className="dashboard-card">
                    <h4><AiOutlineStar size={16} /> Mi Desempeño</h4>
                    <div className="stat-number">
                        {loading ? '…' : stats.entregados}
                        <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}> entregados</span>
                    </div>
                    <div className="stat-label">Pedidos completados</div>
                    <div className="stat-change">
                        <Link to="/trabajador/actividades">Ver mis actividades →</Link>
                    </div>
                </div>
            </div>

            {pedidosRecientes.length > 0 && (
                <div className="quick-actions-box" style={{ marginBottom: '1.5rem' }}>
                    <h4><AiOutlineUnorderedList size={18} /> Mis últimos pedidos asignados</h4>
                    <div className="dt-lista-recientes">
                        {pedidosRecientes.map((p: any) => (
                            <Link to="/pedidos-admin" key={p.id} className="dt-fila-reciente">
                                <span className="dt-folio">{p.folio}</span>
                                <span className="dt-cliente">{p.cliente_nombre_completo}</span>
                                <span className="dt-fecha">{formatFecha(p.fecha_creacion)}</span>
                                <span className="dt-estado-badge" style={{ background: `${ESTADO_COLOR[p.estado] || '#888'}22`, color: ESTADO_COLOR[p.estado] || '#888', border: `1px solid ${ESTADO_COLOR[p.estado] || '#888'}44` }}>
                                    {ESTADO_LABEL[p.estado] || p.estado}
                                </span>
                            </Link>
                        ))}
                    </div>
                    <div className="dt-ver-todos">
                        <Link to="/pedidos-admin">Ver todos →</Link>
                    </div>
                </div>
            )}

            <div className="quick-actions-box">
                <h4><AiOutlineThunderbolt size={18} /> Acciones Rápidas</h4>
                <div className="quick-actions-grid">
                    <Link to="/trabajador/actividades" className="quick-action-btn">
                        <AiOutlineCheckCircle size={16} /> Mis Actividades
                    </Link>
                    <Link to="/pedidos-admin" className="quick-action-btn">
                        <AiOutlineShoppingCart size={16} /> Gestionar Pedidos
                        {stats.pendientes > 0 && (
                            <span className="dt-badge-pendientes">{stats.pendientes}</span>
                        )}
                    </Link>
                    <Link to="/trabajador/perfil" className="quick-action-btn">
                        <AiOutlineUser size={16} /> Mi Perfil
                    </Link>
                    <Link to="/configuracion" className="quick-action-btn">
                        <AiOutlineSetting size={16} /> Ajustes
                    </Link>
                </div>
            </div>
        </div>
    );
}
