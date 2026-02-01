// Ruta: src/components/HeaderPrivado.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/HeaderPrivado.css";

const HeaderPrivado: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Función para marcar la opción activa en el menú
    const isActive = (path: string) => location.pathname === path ? "active" : "";

    return (
        <>
            {/* --- SIDEBAR LATERAL (Navegación Principal) --- */}
            <aside className="sidebar-privado">
                <div className="sidebar-logo" onClick={() => navigate("/inicio")}>
                    <div className="logo-text">Diana Laura</div>
                    <p className="logo-subtext">TU TIENDA DE JOYAS</p>
                </div>

                <nav className="sidebar-nav">
                    {/* Sección Principal */}
                    <button className={`nav-item ${isActive("/inicio")}`} onClick={() => navigate("/inicio")}>
                        <span className="nav-icon">✨</span> Inicio
                    </button>
                    
                    <button className={`nav-item ${isActive("/catalogo")}`} onClick={() => navigate("/catalogo")}>
                        <span className="nav-icon">💎</span> Catálogo de Joyas
                    </button>
                    
                    <button className={`nav-item ${isActive("/pedidos")}`} onClick={() => navigate("/pedidos")}>
                        <span className="nav-icon">📦</span> Mis Pedidos
                    </button>

                    {/* Sección Empresa y Soporte */}
                    <button className={`nav-item ${isActive("/sobre-nosotros")}`} onClick={() => navigate("/sobre-nosotros")}>
                        <span className="nav-icon">📖</span> Sobre nosotros
                    </button>

                    <button className={`nav-item ${isActive("/contacto")}`} onClick={() => navigate("/contacto")}>
                        <span className="nav-icon">✉️</span> Contacto
                    </button>

                    <button className={`nav-item ${isActive("/ubicacion")}`} onClick={() => navigate("/ubicacion")}>
                        <span className="nav-icon">🗺️</span> Ubicación Física
                    </button>
                    
                    <button className={`nav-item ${isActive("/ayuda")}`} onClick={() => navigate("/ayuda")}>
                        <span className="nav-icon">🛠️</span> Centro de Ayuda
                    </button>

                    {/* Botón de Salida */}
                    <button className="nav-item logout-item" onClick={logout}>
                        <span className="nav-icon">🔒</span> Cerrar Sesión
                    </button>
                </nav>
            </aside>

            {/* --- HEADER SUPERIOR (Información de Usuario) --- */}
            <header className="header-top-privado">
                <div className="header-welcome">
                    Bienvenido de nuevo, <strong>{user?.nombre}</strong>
                </div>

                <div className="user-profile-info" onClick={() => navigate("/perfil")}>
                    <div className="user-avatar">
                        {user?.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                        <span className="user-name">{user?.nombre}</span>
                        <span className="user-role">Cliente Premium</span>
                    </div>
                </div>
            </header>
        </>
    );
};

export default HeaderPrivado;