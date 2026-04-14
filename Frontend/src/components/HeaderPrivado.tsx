// Frontend/src/components/HeaderPrivado.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from '../contexts/CartContext';
import "../styles/HeaderPrivado.css";

const HeaderPrivado: React.FC = () => {
    const { user, logout } = useAuth();
    const { count: cartCount } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const sidebarRef = useRef<HTMLDivElement>(null);

    const [sidebarOpen, setSidebarOpen]             = useState(false);
    const [isContentMenuOpen, setIsContentMenuOpen] = useState(false);
    const [isCatalogoMenuOpen, setIsCatalogoMenuOpen] = useState(false);
    const [isDatabaseMenuOpen, setIsDatabaseMenuOpen] = useState(false);
    const [isConfigMenuOpen, setIsConfigMenuOpen]   = useState(false);
    const [isProveedoresMenuOpen, setIsProveedoresMenuOpen] = useState(false);

    const userRole = user?.rol?.toLowerCase().trim() || 'cliente';
    const isActive = (path: string) => location.pathname.startsWith(path) ? "active" : "";

    // Cerrar sidebar al navegar en móvil
    const goTo = (path: string) => {
        navigate(path);
        setSidebarOpen(false);
    };

    // Cerrar sidebar al tocar fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                setIsContentMenuOpen(false);
                setIsCatalogoMenuOpen(false);
                setIsDatabaseMenuOpen(false);
                setIsConfigMenuOpen(false);
                setIsProveedoresMenuOpen(false);
                setSidebarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cerrar sidebar al cambiar de ruta
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <>
            {/* Overlay oscuro al abrir sidebar en móvil */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            <aside className={`sidebar-privado${sidebarOpen ? ' open' : ''}`} ref={sidebarRef}>
                <div
                    className="sidebar-logo"
                    onClick={() => goTo(userRole === 'admin' ? "/admin-dashboard" : userRole === 'trabajador' ? "/dashboard-trabajador" : "/inicio")}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="logo-text">Diana Laura</div>
                    <p className="logo-subtext">TU TIENDA DE JOYAS</p>
                </div>

                <nav className="sidebar-nav">
                    {userRole === 'admin' ? (
                        <>
                            <button className={`nav-item ${isActive("/admin-dashboard")}`} onClick={() => goTo("/admin-dashboard")}>
                                <span className="nav-icon">📊</span> Dashboard Admin
                            </button>

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
                                        <button className={`dropdown-item ${isActive("/admin-categorias") ? "active" : ""}`} onClick={() => goTo("/admin-categorias")}>
                                            <span className="dropdown-icon">🏷️</span> Categorías
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-inventario") ? "active" : ""}`} onClick={() => goTo("/admin-inventario")}>
                                            <span className="dropdown-icon">📦</span> Inventario
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-nuevo-producto") ? "active" : ""}`} onClick={() => goTo("/admin-nuevo-producto")}>
                                            <span className="dropdown-icon">➕</span> Nuevo Producto
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="nav-item-group">
                                <button
                                    className={`nav-item ${isActive("/admin/proveedores") || isActive("/admin/proveedor/") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsProveedoresMenuOpen(!isProveedoresMenuOpen)}
                                >
                                    <span className="nav-icon">🏢</span> Proveedores
                                    <span className={`dropdown-arrow ${isProveedoresMenuOpen ? 'open' : ''}`}>▼</span>
                                </button>
                                {isProveedoresMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button className={`dropdown-item ${isActive("/admin/proveedores") ? "active" : ""}`} onClick={() => goTo("/admin/proveedores")}>
                                            <span className="dropdown-icon">📋</span> Lista de Proveedores
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/proveedor/nuevo") ? "active" : ""}`} onClick={() => goTo("/admin/proveedor/nuevo")}>
                                            <span className="dropdown-icon">➕</span> Nuevo Proveedor
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="nav-item-group">
                                <button
                                    className={`nav-item ${isActive("/admin-database") || isActive("/admin-backups") || isActive("/admin/importar-csv") || isActive("/admin-automation") || isActive("/admin-monitoreo") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsDatabaseMenuOpen(!isDatabaseMenuOpen)}
                                >
                                    <span className="nav-icon">🗄️</span> Gestión BD
                                    <span className={`dropdown-arrow ${isDatabaseMenuOpen ? 'open' : ''}`}>▼</span>
                                </button>
                                {isDatabaseMenuOpen && (
                                    <div className="dropdown-menu">
                                        {/* <button className={`dropdown-item ${isActive("/admin-database") ? "active" : ""}`} onClick={() => goTo("/admin-database")}>
                                            <span className="dropdown-icon">📊</span> Dashboard BD
                                        </button> */}
                                        <button className={`dropdown-item ${isActive("/admin-backups") ? "active" : ""}`} onClick={() => goTo("/admin-backups")}>
                                            <span className="dropdown-icon">💾</span> Respaldos
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/importar-csv") ? "active" : ""}`} onClick={() => goTo("/admin/importar-csv")}>
                                            <span className="dropdown-icon">📥</span> Importar CSV
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/exportar") ? "active" : ""}`} onClick={() => goTo("/admin/exportar")}>
                                            <span className="dropdown-icon">📤</span> Exportar Datos
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/actualizacion-masiva") ? "active" : ""}`} onClick={() => goTo("/admin/actualizacion-masiva")}>
                                            <span className="dropdown-icon">🔄</span> Actualización Masiva
                                        </button>
                                        {/*  <button className={`dropdown-item ${isActive("/admin-automation") ? "active" : ""}`} onClick={() => goTo("/admin-automation")}>
                                            <span className="dropdown-icon">⚡</span> Automatización
                                        </button>
                                        */}
                                        <button className={`dropdown-item ${isActive("/admin-monitoreo") ? "active" : ""}`} onClick={() => goTo("/admin-monitoreo")}>
                                            <span className="dropdown-icon">🖥️</span> Monitoreo
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="nav-item-group">
                                <button
                                    className={`nav-item ${isActive("/admin/configuracion") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsConfigMenuOpen(!isConfigMenuOpen)}
                                >
                                    <span className="nav-icon">⚙️</span> Configuración
                                    <span className={`dropdown-arrow ${isConfigMenuOpen ? 'open' : ''}`}>▼</span>
                                </button>
                                {isConfigMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button className={`dropdown-item ${isActive("/admin/configuracion/variables") ? "active" : ""}`} onClick={() => goTo("/admin/configuracion/variables")}>
                                            <span className="dropdown-icon">🔧</span> Variables del Sistema
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="nav-item-group">
                                <button
                                    className={`nav-item ${isActive("/admin-contenido") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsContentMenuOpen(!isContentMenuOpen)}
                                >
                                    <span className="nav-icon">📝</span> Gestionar Contenido
                                    <span className={`dropdown-arrow ${isContentMenuOpen ? 'open' : ''}`}>▼</span>
                                </button>
                                {isContentMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button className={`dropdown-item ${isActive("/admin-contenido/paginas") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/paginas")}>
                                            <span className="dropdown-icon">📄</span> Gestión de Páginas
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/secciones") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/secciones")}>
                                            <span className="dropdown-icon">📑</span> Gestión de Secciones
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/pagina-inicio") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/pagina-inicio")}>
                                            <span className="dropdown-icon">🎨</span> Contenido de Inicio
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/pagina-noticias") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/pagina-noticias")}>
                                            <span className="dropdown-icon">📰</span> Contenido de Noticias
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/info") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/info")}>
                                            <span className="dropdown-icon">ℹ️</span> Información Empresarial
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/faq") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/faq")}>
                                            <span className="dropdown-icon">❓</span> Preguntas Frecuentes
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/mision") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/mision")}>
                                            <span className="dropdown-icon">🎯</span> Misión, Visión y Valores
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button className={`nav-item ${isActive("/pedidos-admin")}`} onClick={() => goTo("/pedidos-admin")}>
                                <span className="nav-icon">📦</span> Pedidos Tienda
                            </button>
                            <button className={`nav-item ${isActive("/admin-trabajadores")}`} onClick={() => goTo("/admin-trabajadores")}>
                                <span className="nav-icon">👥</span> Personal
                            </button>
                            <button className={`nav-item ${isActive("/admin-reportes")}`} onClick={() => goTo("/admin-reportes")}>
                                <span className="nav-icon">📈</span> Reportes
                            </button>
                            <button className={`nav-item ${isActive("/admin-prediccion")}`} onClick={() => goTo("/admin-prediccion")}>
                                <span className="nav-icon">🔮</span> Modelo Predictivo
                            </button>
                        </>
                    ) : userRole === 'trabajador' ? (
                        <>
                            <button className={`nav-item ${isActive("/dashboard-trabajador")}`} onClick={() => goTo("/dashboard-trabajador")}>
                                <span className="nav-icon">📊</span> Dashboard
                            </button>
                            <button className={`nav-item ${isActive("/pedidos-admin")}`} onClick={() => goTo("/pedidos-admin")}>
                                <span className="nav-icon">📦</span> Gestión de Pedidos
                            </button>
                            <div className="sidebar-divider"></div>
                            <button className={`nav-item ${isActive("/trabajador/actividades")}`} onClick={() => goTo("/trabajador/actividades")}>
                                <span className="nav-icon">✅</span> Mis Actividades
                            </button>
                            <button className={`nav-item ${isActive("/trabajador/perfil")}`} onClick={() => goTo("/trabajador/perfil")}>
                                <span className="nav-icon">👤</span> Mi Perfil
                            </button>
                        </>
                    ) : (
                        <>
                            <button className={`nav-item ${isActive("/inicio")}`} onClick={() => goTo("/inicio")}>
                                <span className="nav-icon">✨</span> Inicio
                            </button>
                            <button className={`nav-item ${isActive("/catalogo")}`} onClick={() => goTo("/catalogo")}>
                                <span className="nav-icon">💎</span> Catálogo
                            </button>
                            <button className={`nav-item ${isActive("/pedidos")}`} onClick={() => goTo("/pedidos")}>
                                <span className="nav-icon">🛍️</span> Mis Pedidos
                            </button>
                            <button className={`nav-item ${isActive("/carrito")}`} onClick={() => goTo("/carrito")}>
                                <span className="nav-icon">🛒</span>
                                Mi Carrito
                                {cartCount > 0 && (
                                    <span style={{
                                        background: '#ecb2c3', color: '#0f0f12',
                                        borderRadius: '50%', fontSize: '0.65rem',
                                        fontWeight: 800, padding: '0.1rem 0.4rem',
                                        marginLeft: 'auto'
                                    }}>
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                            <div className="sidebar-divider"></div>
                            <button className={`nav-item ${isActive("/sobre-nosotros")}`} onClick={() => goTo("/sobre-nosotros")}>
                                <span className="nav-icon">📖</span> Sobre nosotros
                            </button>
                            <button className={`nav-item ${isActive("/ubicacion")}`} onClick={() => goTo("/ubicacion")}>
                                <span className="nav-icon">🗺️</span> Ubicación Física
                            </button>
                            <button className={`nav-item ${isActive("/ayuda")}`} onClick={() => goTo("/ayuda")}>
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
                {/* Botón hamburguesa — solo visible en móvil */}
                <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menú">
                    <span className={`hamburger-line${sidebarOpen ? ' open' : ''}`}></span>
                    <span className={`hamburger-line${sidebarOpen ? ' open' : ''}`}></span>
                    <span className={`hamburger-line${sidebarOpen ? ' open' : ''}`}></span>
                </button>

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