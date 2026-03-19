// Ruta: Frontend/src/screens/trabajador/ActividadesTrabajadorScreen.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { carritoAPI } from "../../services/api";
import "./ActividadesTrabajadorScreen.css";

export default function ActividadesTrabajadorScreen() {
    const { user } = useAuth();
    const [pendientes, setPendientes] = useState<number | null>(null);
    const [misPedidos, setMisPedidos] = useState<number>(0);

    useEffect(() => {
        const cargar = async () => {
            try {
                const data = await carritoAPI.getAllPedidos('pendiente');
                if (data.success) {
                    const todos = data.data || [];
                    setPendientes(todos.length);
                    // Pedidos sin asignar o asignados a mí
                    const mios = todos.filter((p: any) =>
                        p.trabajador_id === user?.dbId || !p.trabajador_id
                    ).length;
                    setMisPedidos(mios);
                }
            } catch { /* silencioso */ }
        };
        cargar();
    }, []);

    return (
        <div className="actividades-container">
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

                <div className="activity-details-box">
                    <p>Permisos Asignados</p>
                    <div className="permissions-grid">
                        <div className="permission-tag"><i className="fas fa-edit"></i> Editar detalles</div>
                        <div className="permission-tag"><i className="fas fa-sync"></i> Cambiar estado</div>
                        <div className="permission-tag"><i className="fas fa-box"></i> Modificar productos</div>
                        <div className="permission-tag"><i className="fas fa-user"></i> Datos cliente</div>
                    </div>
                </div>

                {/* Nota dinámica */}
                <div className="activity-details-box">
                    {pendientes === null ? (
                        <p><i className="fas fa-spinner fa-spin"></i> Cargando pedidos...</p>
                    ) : pendientes === 0 ? (
                        <p><i className="fas fa-check-circle" style={{ color: '#6bcb77' }}></i> <strong>¡Al día!</strong> No hay pedidos pendientes en este momento.</p>
                    ) : (
                        <p>
                            <i className="fas fa-info-circle"></i>{' '}
                            <strong>Nota:</strong> Hay <strong style={{ color: '#ecb2c3' }}>{pendientes}</strong> pedido{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''} de revisión
                            {misPedidos > 0 && ` — ${misPedidos} disponible${misPedidos !== 1 ? 's' : ''} para tomar`}.
                        </p>
                    )}
                </div>

                <div className="activity-actions">
                    <Link to="/pedidos-admin" className="btn-primary-worker">
                        <i className="fas fa-arrow-right"></i> Ir a Pedidos
                        {pendientes !== null && pendientes > 0 && (
                            <span style={{
                                background: '#ecb2c3', color: '#0f0f12',
                                borderRadius: '50%', fontSize: '0.7rem',
                                fontWeight: 800, padding: '0.1rem 0.45rem',
                                marginLeft: '0.5rem'
                            }}>{pendientes}</span>
                        )}
                    </Link>
                    <Link to="/pedidos-admin" className="btn-secondary-worker">
                        <i className="fas fa-history"></i> Ver Historial
                    </Link>
                </div>
            </div>

            {/* SECCIÓN BLOQUEADA */}
            <h3 className="inactive-section-title">
                <i className="fas fa-lock"></i> Actividades No Habilitadas
            </h3>
            <div className="empty-activities-placeholder">
                <i className="fas fa-exclamation-circle"></i>
                <p>
                    No tienes actividades adicionales habilitadas actualmente.
                    Contacta con tu administrador si necesitas acceso a más módulos.
                </p>
            </div>
        </div>
    );
}