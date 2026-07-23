import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { solicitudesAPI } from '../../services/api';
import {
    AiOutlineDollarCircle, AiOutlineStar, AiOutlineBarChart, AiOutlineArrowUp,
    AiOutlineFileText, AiOutlineKey, AiOutlineEdit, AiOutlineBell, AiOutlineInbox,
    AiOutlineShoppingCart, AiOutlineTeam, AiOutlineLineChart, AiOutlineBulb,
    AiOutlineUsergroupAdd, AiOutlineRise,
} from 'react-icons/ai';
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

            {!loadingS && pendientes.length > 0 && (
                <div className="dash-alert-banner">
                    <div className="dash-alert-icon"><AiOutlineBell size={20} /></div>
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

            <div className="dashboard-cards">
                <div className="dashboard-card">
                    <h4><AiOutlineDollarCircle size={15} /> Resumen de Ventas</h4>
                    <div className="stat-number">$12,450</div>
                    <div className="stat-label">Este mes</div>
                    <div className="stat-trend positive">
                        <AiOutlineArrowUp size={13} /> 12% respecto al mes anterior
                    </div>
                </div>

                <div className="dashboard-card">
                    <h4><AiOutlineStar size={15} /> Productos Más Vendidos</h4>
                    <div className="top-products-list">
                        <div className="top-product-item">Anillo Estrella - 45 ventas</div>
                        <div className="top-product-item">Collar Elegancia - 38 ventas</div>
                        <div className="top-product-item">Aretes Diamante - 32 ventas</div>
                    </div>
                </div>

                <div className="dashboard-card">
                    <h4><AiOutlineBarChart size={15} /> Movimientos</h4>
                    <div className="stat-number">127</div>
                    <div className="stat-label">Transacciones hoy</div>
                </div>

                <div className={`dashboard-card dash-card-solicitudes ${pendientes.length > 0 ? 'dash-card-solicitudes--alert' : ''}`}
                    onClick={() => navigate('/admin-perfil')}>
                    <h4><AiOutlineFileText size={15} /> Solicitudes de personal</h4>
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
                                        <AiOutlineKey size={11} /> {recuperaciones.length} código{recuperaciones.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {cambiosNombre.length > 0 && (
                                    <span className="dash-sol-mini-badge dash-sol-mini-badge--nombre">
                                        <AiOutlineEdit size={11} /> {cambiosNombre.length} nombre{cambiosNombre.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div className="stat-link">Ir a Mi Perfil para revisar →</div>
                        </>
                    )}
                </div>
            </div>

            <div className="quick-actions-section">
                <h4 className="section-subtitle">Acciones Rápidas</h4>
                <div className="quick-actions-grid">
                    <button className="btn-action-outline" onClick={() => navigate("/admin-inventario")}>
                        <AiOutlineInbox size={16} /> Ver Inventario
                    </button>
                    <button className="btn-action-outline" onClick={() => navigate("/pedidos-admin")}>
                        <AiOutlineShoppingCart size={16} /> Ver Pedidos
                    </button>
                    <button className="btn-action-outline" onClick={() => navigate("/admin-trabajadores")}>
                        <AiOutlineTeam size={16} /> Gestionar Personal
                    </button>
                    <button className="btn-action-outline" onClick={() => navigate("/admin-reportes")}>
                        <AiOutlineLineChart size={16} /> Ver Reportes
                    </button>
                </div>
            </div>

            <div className="quick-actions-section">
                <h4 className="section-subtitle"><AiOutlineBulb size={18} /> Herramientas Inteligentes</h4>
                <div className="quick-actions-grid">
                    <button className="btn-action-outline dash-ia-btn" onClick={() => navigate("/admin-nuevo-producto")}>
                        <AiOutlineDollarCircle size={16} /> Precio sugerido
                    </button>
                    <button className="btn-action-outline dash-ia-btn" onClick={() => navigate("/admin-segmentos")}>
                        <AiOutlineUsergroupAdd size={16} /> Segmentos de Clientes
                    </button>
                    <button className="btn-action-outline dash-ia-btn" onClick={() => navigate("/admin-prediccion")}>
                        <AiOutlineRise size={16} /> Predicción de Ventas
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardScreen;
