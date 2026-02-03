// Ruta: src/components/HeaderPrivado.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/HeaderPrivado.css";

const HeaderPrivado: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Normalizamos el rol para evitar errores de mayúsculas o espacios
    // Si user o user.rol no existen, por defecto es 'cliente'
    const userRole = user?.rol?.toLowerCase().trim() || 'cliente';

    // Función para marcar la opción activa en el menú
    const isActive = (path: string) => location.pathname === path ? "active" : "";

    return (
        <>
            {/* --- SIDEBAR LATERAL (Navegación Principal) --- */}
            <aside className="sidebar-privado">
                <div 
                    className="sidebar-logo" 
                    onClick={() => navigate(userRole === 'admin' ? "/admin-dashboard" : "/inicio")}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="logo-text">Diana Laura</div>
                    <p className="logo-subtext">TU TIENDA DE JOYAS</p>
                </div>

                <nav className="sidebar-nav">
                    {/* --- VISTA PARA ADMINISTRADOR --- */}
                    {userRole === 'admin' ? (
                        <>
                            <button className={`nav-item ${isActive("/admin-dashboard")}`} onClick={() => navigate("/admin-dashboard")}>
                                <span className="nav-icon">📊</span> Dashboard Admin
                            </button>
                            <button className={`nav-item ${isActive("/admin-productos")}`} onClick={() => navigate("/admin-productos")}>
                                <span className="nav-icon">💎</span> Gestionar Productos
                            </button>
                            <button className={`nav-item ${isActive("/pedidos-admin")}`} onClick={() => navigate("/pedidos-admin")}>
                                <span className="nav-icon">📦</span> Pedidos Tienda
                            </button>
                            <button className={`nav-item ${isActive("/admin-trabajadores")}`} onClick={() => navigate("/admin-trabajadores")}>
                                <span className="nav-icon">👥</span> Personal
                            </button>
                            <button className={`nav-item ${isActive("/admin-reportes")}`} onClick={() => navigate("/admin-reportes")}>
                                <span className="nav-icon">📈</span> Reportes
                            </button>
                        </>
                    ) : (
                        /* --- VISTA PARA CLIENTES --- */
                        <>
                            <button className={`nav-item ${isActive("/inicio")}`} onClick={() => navigate("/inicio")}>
                                <span className="nav-icon">✨</span> Inicio
                            </button>
                            <button className={`nav-item ${isActive("/catalogo")}`} onClick={() => navigate("/catalogo")}>
                                <span className="nav-icon">💎</span> Catálogo
                            </button>
                            <button className={`nav-item ${isActive("/pedidos")}`} onClick={() => navigate("/pedidos")}>
                                <span className="nav-icon">🛍️</span> Mis Pedidos
                            </button>

                            <div className="sidebar-divider"></div>

                            {/* Opciones de Soporte y Empresa (Solo para Clientes) */}
                            <button className={`nav-item ${isActive("/sobre-nosotros")}`} onClick={() => navigate("/sobre-nosotros")}>
                                <span className="nav-icon">📖</span> Sobre nosotros
                            </button>
                            <button className={`nav-item ${isActive("/ubicacion")}`} onClick={() => navigate("/ubicacion")}>
                                <span className="nav-icon">🗺️</span> Ubicación Física
                            </button>
                            <button className={`nav-item ${isActive("/ayuda")}`} onClick={() => navigate("/ayuda")}>
                                <span className="nav-icon">🛠️</span> Centro de Ayuda
                            </button>
                        </>
                    )}

                    <div className="sidebar-divider"></div>

                    {/* Botón de Salida (Común) */}
                    <button className="nav-item logout-item" onClick={logout}>
                        <span className="nav-icon">🔒</span> Cerrar Sesión
                    </button>
                </nav>
            </aside>

            {/* --- HEADER SUPERIOR (Información de Usuario) --- */}
            <header className="header-top-privado">
                <div className="header-welcome">
                    Bienvenido, <strong>{user?.nombre || 'Usuario'}</strong>
                </div>

                <div 
                    className="user-profile-info" 
                    onClick={() => navigate(userRole === 'admin' ? "/admin-perfil" : "/perfil")}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="user-avatar">
                        {user?.nombre?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="user-details">
                        <span className="user-name">{user?.nombre || 'Mi Perfil'}</span>
                        <span className="user-role">
                            {userRole === 'admin' ? "Administrador" : "Cliente Premium"}
                        </span>
                    </div>
                </div>
            </header>
        </>
    );
};

export default HeaderPrivado;