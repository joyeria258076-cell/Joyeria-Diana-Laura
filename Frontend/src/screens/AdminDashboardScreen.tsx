import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/AdminDashboardScreen.css';

const AdminDashboardScreen: React.FC = () => {
    return (
        <div className="dashboard-container">
            <h2 className="dashboard-title">Dashboard Informativo</h2>
            
            {/* TARJETAS DE ESTADÍSTICAS */}
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
                    <div className="stat-link">
                        <Link to="/admin/reportes">Ver movimientos por trabajador →</Link>
                    </div>
                </div>
            </div>
            
            {/* ACCIONES RÁPIDAS */}
            <div className="quick-actions-section">
                <h4 className="section-subtitle">Acciones Rápidas</h4>
                <div className="quick-actions-grid">
                    <Link to="/admin/productos" className="btn-action-outline">
                        <i className="fas fa-plus"></i> Agregar Producto
                    </Link>
                    <Link to="/admin/pedidos" className="btn-action-outline">
                        <i className="fas fa-box"></i> Ver Pedidos
                    </Link>
                    <Link to="/admin/trabajadores" className="btn-action-outline">
                        <i className="fas fa-users"></i> Gestionar Personal
                    </Link>
                    <Link to="/admin/reportes" className="btn-action-outline">
                        <i className="fas fa-chart-line"></i> Ver Reportes
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardScreen;