// Frontend/src/components/HeaderPrivado.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/HeaderPrivado.css";

const HeaderPrivado: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const sidebarRef = useRef<HTMLDivElement>(null);
    
    const [isContentMenuOpen, setIsContentMenuOpen] = useState(false);
    const [isCatalogoMenuOpen, setIsCatalogoMenuOpen] = useState(false);
    const [isDatabaseMenuOpen, setIsDatabaseMenuOpen] = useState(false);
    const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false); // Nuevo estado

    const userRole = user?.rol?.toLowerCase().trim() || 'cliente';

    const isActive = (path: string) => location.pathname.startsWith(path) ? "active" : "";

    // Cerrar menús al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                setIsContentMenuOpen(false);
                setIsCatalogoMenuOpen(false);
                setIsDatabaseMenuOpen(false);
                setIsConfigMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <aside className="sidebar-privado" ref={sidebarRef}>
                <div 
                    className="sidebar-logo" 
                    onClick={() => navigate(userRole === 'admin' ? "/admin-dashboard" : userRole === 'trabajador' ? "/dashboard-trabajador" : "/inicio")}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="logo-text">Diana Laura</div>
                    <p className="logo-subtext">TU TIENDA DE JOYAS</p>
                </div>

                <nav className="sidebar-nav">
                    {userRole === 'admin' ? (
                        <>
                            <button className={`nav-item ${isActive("/admin-dashboard")}`} onClick={() => navigate("/admin-dashboard")}>
                                <span className="nav-icon">📊</span> Dashboard Admin
                            </button>
                            
                            {/* 🌟 MENÚ DESPLEGABLE DE GESTIÓN DE CATÁLOGO */}
                            <div className="nav-item-group">
                                <button 
                                    className={`nav-item ${isActive("/admin-inventario") || isActive("/admin-nuevo-producto") || isActive("/admin-categorias") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsCatalogoMenuOpen(!isCatalogoMenuOpen)}
                                >
                                    <span className="nav-icon">📋</span> Gestión de catálogo
                                    <span className={`dropdown-arrow ${isCatalogoMenuOpen ? 'open' : ''}`}>▼</span>
                                </button>
                                
                                {isCatalogoMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-categorias") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-categorias")}
                                        >
                                            <span className="dropdown-icon">🏷️</span> Categorías
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-inventario") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-inventario")}
                                        >
                                            <span className="dropdown-icon">📦</span> Inventario
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-nuevo-producto") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-nuevo-producto")}
                                        >
                                            <span className="dropdown-icon">➕</span> Nuevo Producto
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 📁 NUEVO MENÚ DESPLEGABLE DE PROVEEDORES */}
                            <div className="nav-item-group">
                                <button 
                                    className={`nav-item ${isActive("/admin/proveedores") || isActive("/admin/proveedor/nuevo") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => {
                                        // Navegar directamente a la lista de proveedores
                                        navigate("/admin/proveedores");
                                    }}
                                >
                                    <span className="nav-icon">🏢</span> Proveedores
                                </button>
                            </div>
                            
                            {/* 📁 MENÚ DESPLEGABLE DE BASE DE DATOS */}
                            <div className="nav-item-group">
                                <button 
                                    className={`nav-item ${isActive("/admin-database") || isActive("/admin-backups") || isActive("/admin/importar-csv") || isActive("/admin-automation") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsDatabaseMenuOpen(!isDatabaseMenuOpen)}
                                >
                                    <span className="nav-icon">🗄️</span> Gestión BD
                                    <span className={`dropdown-arrow ${isDatabaseMenuOpen ? 'open' : ''}`}>▼</span>
                                </button>
                                
                                {isDatabaseMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-database") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-database")}
                                        >
                                            <span className="dropdown-icon">📊</span> Dashboard BD
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-backups") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-backups")}
                                        >
                                            <span className="dropdown-icon">💾</span> Respaldos
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin/importar-csv") ? "active" : ""}`}
                                            onClick={() => navigate("/admin/importar-csv")}
                                        >
                                            <span className="dropdown-icon">📥</span> Importar CSV
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-automation") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-automation")}
                                        >
                                            <span className="dropdown-icon">⚡</span> Automatización
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* ⚙️ NUEVO MENÚ DESPLEGABLE DE CONFIGURACIÓN */}
                            <div className="nav-item-group">
                                <button 
                                    className={`nav-item ${isActive("/admin/configuracion") || isActive("/admin/configuracion/general") || isActive("/admin/configuracion/variables") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsConfigMenuOpen(!isConfigMenuOpen)}
                                >
                                    <span className="nav-icon">⚙️</span> Configuración
                                    <span className={`dropdown-arrow ${isConfigMenuOpen ? 'open' : ''}`}>▼</span>
                                </button>
                                
                                {isConfigMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button 
                                            className={`dropdown-item ${isActive("/admin/configuracion/variables") ? "active" : ""}`}
                                            onClick={() => navigate("/admin/configuracion/variables")}
                                        >
                                            <span className="dropdown-icon">🔧</span> Variables del Sistema
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin/configuracion/general") ? "active" : ""}`}
                                            onClick={() => navigate("/admin/configuracion/general")}
                                        >
                                            <span className="dropdown-icon">🌐</span> Configuración General
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* MENÚ DESPLEGABLE DE GESTIONAR CONTENIDO */}
                            <div className="nav-item-group">
                                <button 
                                    className={`nav-item ${isActive("/admin-contenido") || isActive("/admin-contenido/paginas") || isActive("/admin-contenido/secciones") || isActive("/admin-contenido/pagina-inicio") || isActive("/admin-contenido/pagina-noticias") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsContentMenuOpen(!isContentMenuOpen)}
                                >
                                    <span className="nav-icon">📝</span> Gestionar Contenido
                                    <span className={`dropdown-arrow ${isContentMenuOpen ? 'open' : ''}`}>▼</span>
                                </button>
                                
                                {isContentMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-contenido/paginas") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-contenido/paginas")}
                                        >
                                            <span className="dropdown-icon">📄</span> Gestión de Páginas
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-contenido/secciones") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-contenido/secciones")}
                                        >
                                            <span className="dropdown-icon">📑</span> Gestión de Secciones
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-contenido/pagina-inicio") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-contenido/pagina-inicio")}
                                        >
                                            <span className="dropdown-icon">🎨</span> Contenido de Inicio
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-contenido/pagina-noticias") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-contenido/pagina-noticias")}
                                        >
                                            <span className="dropdown-icon">📰</span> Contenido de Noticias
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-contenido/info") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-contenido/info")}
                                        >
                                            <span className="dropdown-icon">ℹ️</span> Información Empresarial
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-contenido/faq") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-contenido/faq")}
                                        >
                                            <span className="dropdown-icon">❓</span> Preguntas Frecuentes
                                        </button>
                                        <button 
                                            className={`dropdown-item ${isActive("/admin-contenido/mision") ? "active" : ""}`}
                                            onClick={() => navigate("/admin-contenido/mision")}
                                        >
                                            <span className="dropdown-icon">🎯</span> Misión, Visión y Valores
                                        </button>
                                    </div>
                                )}
                            </div>

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
                    ) : userRole === 'trabajador' ? (
                        /* --- VISTA PARA TRABAJADORES --- */
                        <>
                            <button className={`nav-item ${isActive("/dashboard-trabajador")}`} onClick={() => navigate("/dashboard-trabajador")}>
                                <span className="nav-icon">📊</span> Dashboard
                            </button>

                            <div className="sidebar-divider"></div>
                            
                            <button className={`nav-item ${isActive("/trabajador/actividades")}`} onClick={() => navigate("/trabajador/actividades")}>
                                <span className="nav-icon">✅</span> Mis Actividades
                            </button>
                            
                            <button className={`nav-item ${isActive("/trabajador/configuracion")}`} onClick={() => navigate("/trabajador/configuracion")}>
                                <span className="nav-icon">⚙️</span> Configuración
                            </button>
                            <button className={`nav-item ${isActive("/trabajador/perfil")}`} onClick={() => navigate("/trabajador/perfil")}>
                                <span className="nav-icon">👤</span> Mi Perfil
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

                    <button className="nav-item logout-item" onClick={logout}>
                        <span className="nav-icon">🔒</span> Cerrar Sesión
                    </button>
                </nav>
            </aside>

            <header className="header-top-privado">
                <div className="header-welcome">
                    Bienvenido, <strong>{user?.nombre || 'Usuario'}</strong>
                </div>

                <div 
                    className="user-profile-info" 
                    onClick={() => navigate(userRole === 'admin' ? "/admin-perfil" : userRole === 'trabajador' ? "/trabajador/perfil" : "/perfil")}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="user-avatar">
                        {user?.nombre?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="user-details">
                        <span className="user-name">{user?.nombre || 'Mi Perfil'}</span>
                        <span className="user-role">
                            {userRole === 'admin' ? "Administrador" : userRole === 'trabajador' ? "Trabajador" : "Cliente Premium"}
                        </span>
                    </div>
                </div>
            </header>
        </>
    );
};

export default HeaderPrivado;