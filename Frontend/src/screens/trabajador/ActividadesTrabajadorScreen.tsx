// Ruta: Frontend/src/screens/trabajador/ActividadesTrabajadorScreen.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { carritoAPI } from "../../services/api";
import {
    AiOutlineCheckSquare, AiOutlineShoppingCart, AiOutlineCheckCircle, AiOutlineEdit,
    AiOutlineSync, AiOutlineInbox, AiOutlineUser, AiOutlineLoading3Quarters, AiOutlineInfoCircle,
    AiOutlineArrowRight, AiOutlineHistory, AiOutlineLock, AiOutlineExclamationCircle,
} from "react-icons/ai";
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
                <AiOutlineCheckSquare size={20} /> Actividades Habilitadas
            </h2>

            <div className="activity-card">
                <h3>
                    <AiOutlineShoppingCart size={18} /> Modificación de Pedidos
                    <span className="activity-badge">
                        <AiOutlineCheckCircle size={13} /> Habilitada
                    </span>
                </h3>

                <p className="activity-description">
                    Hola <strong>{user?.nombre || "Trabajador"}</strong>, en esta sección puedes modificar el estado y contenido de los pedidos asignados.
                    Esta actividad te permite actualizar información de clientes, cantidades y detalles de productos según las necesidades del negocio.
                </p>

                <div className="activity-details-box">
                    <p>Permisos Asignados</p>
                    <div className="permissions-grid">
                        <div className="permission-tag"><AiOutlineEdit size={14} /> Editar detalles</div>
                        <div className="permission-tag"><AiOutlineSync size={14} /> Cambiar estado</div>
                        <div className="permission-tag"><AiOutlineInbox size={14} /> Modificar productos</div>
                        <div className="permission-tag"><AiOutlineUser size={14} /> Datos cliente</div>
                    </div>
                </div>

                <div className="activity-details-box">
                    {pendientes === null ? (
                        <p><AiOutlineLoading3Quarters size={14} className="actividades-spin" /> Cargando pedidos...</p>
                    ) : pendientes === 0 ? (
                        <p><AiOutlineCheckCircle size={14} className="actividades-icon-ok" /> <strong>¡Al día!</strong> No hay pedidos pendientes en este momento.</p>
                    ) : (
                        <p>
                            <AiOutlineInfoCircle size={14} />{' '}
                            <strong>Nota:</strong> Hay <strong className="actividades-highlight">{pendientes}</strong> pedido{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''} de revisión
                            {misPedidos > 0 && ` — ${misPedidos} disponible${misPedidos !== 1 ? 's' : ''} para tomar`}.
                        </p>
                    )}
                </div>

                <div className="activity-actions">
                    <Link to="/pedidos-admin" className="btn-primary-worker">
                        <AiOutlineArrowRight size={14} /> Ir a Pedidos
                        {pendientes !== null && pendientes > 0 && (
                            <span className="actividades-badge-count">{pendientes}</span>
                        )}
                    </Link>
                    <Link to="/pedidos-admin" className="btn-secondary-worker">
                        <AiOutlineHistory size={14} /> Ver Historial
                    </Link>
                </div>
            </div>

            <h3 className="inactive-section-title">
                <AiOutlineLock size={16} /> Actividades No Habilitadas
            </h3>
            <div className="empty-activities-placeholder">
                <AiOutlineExclamationCircle size={24} />
                <p>
                    No tienes actividades adicionales habilitadas actualmente.
                    Contacta con tu administrador si necesitas acceso a más módulos.
                </p>
            </div>
        </div>
    );
}
