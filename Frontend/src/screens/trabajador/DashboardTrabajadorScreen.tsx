import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./DashboardTrabajadorScreen.css";

export default function DashboardTrabajadorScreen() {
  const { user } = useAuth();

  return (
    <div className="dashboard-container">
      {/* HEADER DE BIENVENIDA */}
      <div className="welcome-header">
         <h2>
            Bienvenido, <span className="accent-name">{user?.nombre?.split(' ')[0] || "Trabajador"}</span>
         </h2>
         <p>Aquí tienes el resumen de tu actividad y métricas clave.</p>
      </div>
      
      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h4><i className="fas fa-shopping-bag"></i> Pedidos Procesados</h4>
          <div className="stat-number">48</div>
          <div className="stat-label">Este mes</div>
          <div className="stat-change" style={{ color: "#ECB2C3" }}>
            <i className="fas fa-arrow-up"></i> 8% respecto al mes anterior
          </div>
        </div>
        
        <div className="dashboard-card">
          <h4><i className="fas fa-check-circle"></i> Tareas Completadas</h4>
          <div className="stat-number">24</div>
          <div className="stat-label">Tareas activas</div>
          <div className="stat-change" style={{ color: "#D4B5C8" }}>
            <i className="fas fa-clock"></i> Actualizado hace 2h
          </div>
        </div>
        
        <div className="dashboard-card">
          <h4><i className="fas fa-star"></i> Desempeño</h4>
          <div className="stat-number">9.2<span style={{fontSize: '1rem', color: '#D4B5C8'}}>/10</span></div>
          <div className="stat-label">Calificación promedio</div>
          <div className="stat-change">
            <Link to="/trabajador/actividades" style={{ color: "#ECB2C3", textDecoration: "none", fontWeight: '600' }}>
              Ver detalles de progreso →
            </Link>
          </div>
        </div>
      </div>
      
      {/* ACCIONES RÁPIDAS */}
      <div className="quick-actions-box">
        <h4><i className="fas fa-bolt"></i> Acciones Rápidas</h4>
        <div className="quick-actions-grid">
          <Link to="/trabajador/actividades" className="quick-action-btn">
             Mis Actividades
          </Link>
          <Link to="/pedidos-admin" className="quick-action-btn">
             Procesar Pedido
          </Link>
          <Link to="/trabajador/perfil" className="quick-action-btn">
             Mi Perfil
          </Link>
          <Link to="/trabajador/configuracion" className="quick-action-btn">
             Ajustes
          </Link>
        </div>
      </div>
    </div>
  );
}