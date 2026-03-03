import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./ActividadesTrabajadorScreen.css"; // Asegúrate de crear este archivo CSS para los estilos específicos de esta pantalla

export default function ActividadesTrabajadorScreen() {
  const { user } = useAuth();

  return (
    <div className="actividades-container">
      {/* TÍTULO PRINCIPAL */}
      <h2 className="actividades-titulo">
        <i className="fas fa-tasks"></i> Actividades Habilitadas
      </h2>

      {/* CARD: MODIFICACIÓN DE PEDIDOS */}
      <div className="activity-card">
        <h3>
          <i className="fas fa-shopping-bag"></i> Modificación de Pedidos
          <span className="activity-badge">
            <i className="fas fa-check-circle"></i> Habilitada
          </span>
        </h3>

        <p className="activity-description">
          Hola <strong>{user?.nombre || "Trabajador"}</strong>, en esta sección puedes modificar el estado y contenido de los pedidos asignados. 
          Esta actividad te permite actualizar información de clientes, cantidades y detalles de productos según las necesidades del negocio.
        </p>

        {/* CONTENEDOR DE PERMISOS */}
        <div className="activity-details-box">
          <p>Permisos Asignados</p>
          <div className="permissions-grid">
            <div className="permission-tag">
              <i className="fas fa-edit"></i> Editar detalles
            </div>
            <div className="permission-tag">
              <i className="fas fa-sync"></i> Cambiar estado
            </div>
            <div className="permission-tag">
              <i className="fas fa-box"></i> Modificar productos
            </div>
            <div className="permission-tag">
              <i className="fas fa-user"></i> Datos cliente
            </div>
          </div>
        </div>

        {/* NOTA INFORMATIVA */}
        <div className="activity-details-box">
          <p>
            <i className="fas fa-info-circle"></i> <strong>Nota:</strong> Tienes 5 pedidos pendientes de revisión.
          </p>
        </div>

        {/* ACCIONES */}
        <div className="activity-actions">
          <Link to="/pedidos-admin" className="btn-primary-worker">
            <i className="fas fa-arrow-right"></i> Ir a Pedidos
          </Link>
          <button className="btn-secondary-worker">
            <i className="fas fa-history"></i> Ver Historial
          </button>
        </div>
      </div>

      {/* SECCIÓN BLOQUEADA (DASHED) */}
      <h3 className="inactive-section-title">
        <i className="fas fa-lock"></i> Actividades No Habilitadas
      </h3>

      <div className="empty-activities-placeholder">
        <i className="fas fa-exclamation-circle"></i>
        <p>
          No tienes actividades adicionales habilitadas actualmente. 
          Contacta con tu administrador si necesitas acceso a más módulos o funcionalidades del sistema.
        </p>
      </div>
    </div>
  );
}