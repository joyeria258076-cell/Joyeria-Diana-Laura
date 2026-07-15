import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { solicitudesAPI } from '../../services/api';
import './AdminDashboardScreen.css';

const AdminDashboardScreen: React.FC = () => {
    const navigate = useNavigate();
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [loadingS, setLoadingS] = useState(true);

    useEffect(() => {
        const cargar = async () => {
            try {
                const res = await solicitudesAPI.getTodas();
                if (res.success) setSolicitudes(res.data || []);
            } catch { /**/ }
            finally { setLoadingS(false); }
        };
        cargar();
    }, []);

    const pendientes        = solicitudes.filter(s => s.estado === 'pendiente');
    const recuperaciones    = pendientes.filter(s => s.campo === 'recuperar_codigo');
    const cambiosNombre     = pendientes.filter(s => s.campo === 'nombre');

    return (
        <div className="dashboard-container">
            <h2 className="dashboard-title">Dashboard Informativo</h2>

            {/* ── SOLICITUDES PENDIENTES WIDGET ── */}
            {!loadingS && pendientes.length > 0 && (
                <div className="dash-alert-banner">
                    <div className="dash-alert-icon">🔔</div>
                    <div className="dash-alert-body">
                        <span className="dash-alert-title">
                            Tienes <strong>{pendientes.length}</strong> solicitud{pendientes.length !== 1 ? 'es' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}
                        </span>
                        <span className="dash-alert-sub">
                            {recuperaciones.length > 0 && `${recuperaciones.length} recuperación${recuperaciones.length !== 1 ? 'es' : ''} de código`}
                            {recuperaciones.length > 0 && cambiosNombre.length > 0 && ' · '}
                            {cambiosNombre.length > 0 && `${cambiosNombre.length} cambio${cambiosNombre.length !== 1 ? 's' : ''} de nombre`}
                        </span>
                    </div>
                    <button className="dash-alert-btn" onClick={() => navigate('/admin-perfil')}>
                        Revisar ahora →
                    </button>
                </div>
            )}

            {/* ── TARJETAS DE ESTADÍSTICAS ── */}
            <div className="dashboard-cards">
                <div className="dashboard-card">
                    <h4><i className="fas fa-dollar-sign"></i> Resumen de Ventas</h4>
                    <div className="stat-number">$12,450</div>
                    <div className="stat-label">Este mes</div>
                    <div className="stat-trend positive">
                        <i className="fas fa-arrow-up"></i> 12% respecto al mes anterior
                    </div>
                </div>

                <div className="dashboard-card">
                    <h4><i className="fas fa-star"></i> Productos Más Vendidos</h4>
                    <div className="top-products-list">
                        <div className="top-product-item">Anillo Estrella - 45 ventas</div>
                        <div className="top-product-item">Collar Elegancia - 38 ventas</div>
                        <div className="top-product-item">Aretes Diamante - 32 ventas</div>
                    </div>
                </div>

                <div className="dashboard-card">
                    <h4><i className="fas fa-chart-bar"></i> Movimientos</h4>
                    <div className="stat-number">127</div>
                    <div className="stat-label">Transacciones hoy</div>
                </div>

                {/* Card de solicitudes pendientes */}
                <div className={`dashboard-card dash-card-solicitudes ${pendientes.length > 0 ? 'dash-card-solicitudes--alert' : ''}`}
                    onClick={() => navigate('/admin-perfil')} style={{ cursor: 'pointer' }}>
                    <h4>📋 Solicitudes de personal</h4>
                    {loadingS ? (
                        <div className="stat-label">Cargando...</div>
                    ) : pendientes.length === 0 ? (
                        <>
                            <div className="stat-number stat-number--ok">✓</div>
                            <div className="stat-label">Sin solicitudes pendientes</div>
                        </>
                    ) : (
                        <>
                            <div className="stat-number stat-number--alert">{pendientes.length}</div>
                            <div className="stat-label">Pendiente{pendientes.length !== 1 ? 's' : ''} de revisión</div>
                            <div className="dash-sol-mini-list">
                                {recuperaciones.length > 0 && (
                                    <span className="dash-sol-mini-badge dash-sol-mini-badge--codigo">
                                        🔑 {recuperaciones.length} código{recuperaciones.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {cambiosNombre.length > 0 && (
                                    <span className="dash-sol-mini-badge dash-sol-mini-badge--nombre">
                                        ✏️ {cambiosNombre.length} nombre{cambiosNombre.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div className="stat-link">Ir a Mi Perfil para revisar →</div>
                        </>
                    )}
                </div>
            </div>

            {/* ── ACCIONES RÁPIDAS ── */}
            <div className="quick-actions-section">
                <h4 className="section-subtitle">Acciones Rápidas</h4>
                <div className="quick-actions-grid">
                    <button className="btn-action-outline" onClick={() => navigate("/admin-inventario")}>
                        <i className="fas fa-plus"></i> Ver Inventario
                    </button>
                    <button className="btn-action-outline" onClick={() => navigate("/pedidos-admin")}>
                        <i className="fas fa-box"></i> Ver Pedidos
                    </button>
                    <button className="btn-action-outline" onClick={() => navigate("/admin-trabajadores")}>
                        <i className="fas fa-users"></i> Gestionar Personal
                    </button>
                    <button className="btn-action-outline" onClick={() => navigate("/admin-reportes")}>
                        <i className="fas fa-chart-line"></i> Ver Reportes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardScreen;
