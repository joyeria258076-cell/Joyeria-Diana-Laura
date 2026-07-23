// Frontend/src/components/HeaderPrivado.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from '../contexts/CartContext';
import { useNotificaciones } from '../contexts/NotificacionesContext';
import {
    AiOutlineDashboard, AiOutlineAppstore, AiOutlineUnorderedList, AiOutlineTag, AiOutlineInbox,
    AiOutlinePlusCircle, AiOutlineFolderOpen, AiOutlineBank, AiOutlineDatabase, AiOutlineSave,
    AiOutlineImport, AiOutlineExport, AiOutlineSync, AiOutlineDesktop, AiOutlineSetting, AiOutlineTool,
    AiOutlineEdit, AiOutlineFileText, AiOutlineProfile, AiOutlineBgColors, AiOutlineRead,
    AiOutlineInfoCircle, AiOutlineQuestionCircle, AiOutlineAim, AiOutlineAudit, AiOutlineShoppingCart,
    AiOutlineFlag, AiOutlineTeam, AiOutlineUser, AiOutlineBarChart, AiOutlineExperiment,
    AiOutlineUsergroupAdd, AiOutlineCheckSquare, AiOutlineHome, AiOutlineShop, AiOutlineHeart,
    AiOutlineBook, AiOutlineEnvironment, AiOutlineLogout, AiOutlineBell, AiOutlineDown,
} from "react-icons/ai";
import "../styles/HeaderPrivado.css";

const HeaderPrivado: React.FC = () => {
    const { user, logout } = useAuth();
    const { count: cartCount } = useCart();
    const { noLeidas } = useNotificaciones();
    const navigate = useNavigate();
    const location = useLocation();
    const sidebarRef = useRef<HTMLDivElement>(null);

    const [sidebarOpen, setSidebarOpen]             = useState(false);
    const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
    const [isContentMenuOpen, setIsContentMenuOpen] = useState(false);
    const [isCatalogoMenuOpen, setIsCatalogoMenuOpen] = useState(false);
    const [isDatabaseMenuOpen, setIsDatabaseMenuOpen] = useState(false);
    const [isConfigMenuOpen, setIsConfigMenuOpen]   = useState(false);
    const [isProveedoresMenuOpen, setIsProveedoresMenuOpen] = useState(false);

    const userRole = user?.rol?.toLowerCase().trim() || 'cliente';
    const isActive = (path: string) => location.pathname.startsWith(path) ? "active" : "";

    // Cargar conteo de solicitudes pendientes para admin
    useEffect(() => {
        if (userRole !== 'admin') return;
        const cargar = async () => {
            try {
                const stored = JSON.parse(localStorage.getItem('diana_laura_user') || '{}');
                const res = await fetch('/api/solicitudes', {
                    headers: { Authorization: `Bearer ${stored.token}`, 'x-session-token': localStorage.getItem('diana_laura_session_token') || '' }
                });
                const data = await res.json();
                if (data.success) {
                    const pendientes = (data.data || []).filter((s: any) => s.estado === 'pendiente').length;
                    setSolicitudesPendientes(pendientes);
                }
            } catch { /**/ }
        };
        cargar();
        const interval = setInterval(cargar, 30000); // refresca cada 30s
        return () => clearInterval(interval);
    }, [userRole, location.pathname]);

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
                                <span className="nav-icon"><AiOutlineDashboard size={16} /></span> Dashboard Admin
                            </button>

                            <div className="nav-item-group">
                                <button
                                    className={`nav-item ${isActive("/admin-inventario") || isActive("/admin-nuevo-producto") || isActive("/admin-categorias") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsCatalogoMenuOpen(!isCatalogoMenuOpen)}
                                >
                                    <span className="nav-icon"><AiOutlineAppstore size={16} /></span> Gestión de catálogo
                                    <span className={`dropdown-arrow ${isCatalogoMenuOpen ? 'open' : ''}`}><AiOutlineDown size={12} /></span>
                                </button>
                                {isCatalogoMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button className={`dropdown-item ${isActive("/admin-categorias") ? "active" : ""}`} onClick={() => goTo("/admin-categorias")}>
                                            <span className="dropdown-icon"><AiOutlineTag size={14} /></span> Categorías
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-inventario") ? "active" : ""}`} onClick={() => goTo("/admin-inventario")}>
                                            <span className="dropdown-icon"><AiOutlineInbox size={14} /></span> Inventario
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-nuevo-producto") ? "active" : ""}`} onClick={() => goTo("/admin-nuevo-producto")}>
                                            <span className="dropdown-icon"><AiOutlinePlusCircle size={14} /></span> Nuevo Producto
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/promociones") ? "active" : ""}`} onClick={() => goTo("/admin/promociones")}>
                                            <span className="dropdown-icon"><AiOutlineTag size={14} /></span> Promociones
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/colecciones") ? "active" : ""}`} onClick={() => goTo("/admin/colecciones")}>
                                            <span className="dropdown-icon"><AiOutlineFolderOpen size={14} /></span> Colecciones
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="nav-item-group">
                                <button
                                    className={`nav-item ${isActive("/admin/proveedores") || isActive("/admin/proveedor/") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsProveedoresMenuOpen(!isProveedoresMenuOpen)}
                                >
                                    <span className="nav-icon"><AiOutlineBank size={16} /></span> Proveedores
                                    <span className={`dropdown-arrow ${isProveedoresMenuOpen ? 'open' : ''}`}><AiOutlineDown size={12} /></span>
                                </button>
                                {isProveedoresMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button className={`dropdown-item ${isActive("/admin/proveedores") ? "active" : ""}`} onClick={() => goTo("/admin/proveedores")}>
                                            <span className="dropdown-icon"><AiOutlineUnorderedList size={14} /></span> Lista de Proveedores
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/proveedor/nuevo") ? "active" : ""}`} onClick={() => goTo("/admin/proveedor/nuevo")}>
                                            <span className="dropdown-icon"><AiOutlinePlusCircle size={14} /></span> Nuevo Proveedor
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="nav-item-group">
                                <button
                                    className={`nav-item ${isActive("/admin-database") || isActive("/admin-backups") || isActive("/admin/importar-csv") || isActive("/admin-automation") || isActive("/admin-monitoreo") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsDatabaseMenuOpen(!isDatabaseMenuOpen)}
                                >
                                    <span className="nav-icon"><AiOutlineDatabase size={16} /></span> Gestión BD
                                    <span className={`dropdown-arrow ${isDatabaseMenuOpen ? 'open' : ''}`}><AiOutlineDown size={12} /></span>
                                </button>
                                {isDatabaseMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button className={`dropdown-item ${isActive("/admin-backups") ? "active" : ""}`} onClick={() => goTo("/admin-backups")}>
                                            <span className="dropdown-icon"><AiOutlineSave size={14} /></span> Respaldos
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/importar-csv") ? "active" : ""}`} onClick={() => goTo("/admin/importar-csv")}>
                                            <span className="dropdown-icon"><AiOutlineImport size={14} /></span> Importar CSV
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/exportar") ? "active" : ""}`} onClick={() => goTo("/admin/exportar")}>
                                            <span className="dropdown-icon"><AiOutlineExport size={14} /></span> Exportar Datos
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin/actualizacion-masiva") ? "active" : ""}`} onClick={() => goTo("/admin/actualizacion-masiva")}>
                                            <span className="dropdown-icon"><AiOutlineSync size={14} /></span> Actualización Masiva
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-monitoreo") ? "active" : ""}`} onClick={() => goTo("/admin-monitoreo")}>
                                            <span className="dropdown-icon"><AiOutlineDesktop size={14} /></span> Monitoreo
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="nav-item-group">
                                <button
                                    className={`nav-item ${isActive("/admin/configuracion") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsConfigMenuOpen(!isConfigMenuOpen)}
                                >
                                    <span className="nav-icon"><AiOutlineSetting size={16} /></span> Configuración
                                    <span className={`dropdown-arrow ${isConfigMenuOpen ? 'open' : ''}`}><AiOutlineDown size={12} /></span>
                                </button>
                                {isConfigMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button className={`dropdown-item ${isActive("/admin/configuracion/variables") ? "active" : ""}`} onClick={() => goTo("/admin/configuracion/variables")}>
                                            <span className="dropdown-icon"><AiOutlineTool size={14} /></span> Variables del Sistema
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="nav-item-group">
                                <button
                                    className={`nav-item ${isActive("/admin-contenido") ? "active" : ""} dropdown-toggle`}
                                    onClick={() => setIsContentMenuOpen(!isContentMenuOpen)}
                                >
                                    <span className="nav-icon"><AiOutlineEdit size={16} /></span> Gestionar Contenido
                                    <span className={`dropdown-arrow ${isContentMenuOpen ? 'open' : ''}`}><AiOutlineDown size={12} /></span>
                                </button>
                                {isContentMenuOpen && (
                                    <div className="dropdown-menu">
                                        <button className={`dropdown-item ${isActive("/admin-contenido/paginas") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/paginas")}>
                                            <span className="dropdown-icon"><AiOutlineFileText size={14} /></span> Gestión de Páginas
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/secciones") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/secciones")}>
                                            <span className="dropdown-icon"><AiOutlineProfile size={14} /></span> Gestión de Secciones
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/pagina-inicio") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/pagina-inicio")}>
                                            <span className="dropdown-icon"><AiOutlineBgColors size={14} /></span> Contenido de Inicio
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/pagina-noticias") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/pagina-noticias")}>
                                            <span className="dropdown-icon"><AiOutlineRead size={14} /></span> Contenido de Noticias
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/info") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/info")}>
                                            <span className="dropdown-icon"><AiOutlineInfoCircle size={14} /></span> Información Empresarial
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/faq") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/faq")}>
                                            <span className="dropdown-icon"><AiOutlineQuestionCircle size={14} /></span> Preguntas Frecuentes
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-contenido/mision") ? "active" : ""}`} onClick={() => goTo("/admin-contenido/mision")}>
                                            <span className="dropdown-icon"><AiOutlineAim size={14} /></span> Misión, Visión y Valores
                                        </button>
                                        <button className={`dropdown-item ${isActive("/admin-legal") ? "active" : ""}`} onClick={() => goTo("/admin-legal")}>
                                            <span className="dropdown-icon"><AiOutlineAudit size={14} /></span> Documentos Legales
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button className={`nav-item ${isActive("/pedidos-admin")}`} onClick={() => goTo("/pedidos-admin")}>
                                <span className="nav-icon"><AiOutlineShoppingCart size={16} /></span> Pedidos Tienda
                            </button>
                            <button className={`nav-item ${isActive("/apartados-admin")}`} onClick={() => goTo("/apartados-admin")}>
                                <span className="nav-icon"><AiOutlineFlag size={16} /></span> Apartados
                            </button>
                            <button className={`nav-item ${isActive("/admin-trabajadores")}`} onClick={() => goTo("/admin-trabajadores")}>
                                <span className="nav-icon"><AiOutlineTeam size={16} /></span> Personal
                            </button>
                            <button className={`nav-item ${isActive("/admin-perfil")}`} onClick={() => goTo("/admin-perfil")} style={{ position: 'relative' }}>
                                <span className="nav-icon"><AiOutlineUser size={16} /></span> Mi Perfil
                                {solicitudesPendientes > 0 && (
                                    <span className="nav-badge">{solicitudesPendientes}</span>
                                )}
                            </button>
                            <button className={`nav-item ${isActive("/admin-reportes")}`} onClick={() => goTo("/admin-reportes")}>
                                <span className="nav-icon"><AiOutlineBarChart size={16} /></span> Reportes
                            </button>
                            <button className={`nav-item ${isActive("/admin-prediccion")}`} onClick={() => goTo("/admin-prediccion")}>
                                <span className="nav-icon"><AiOutlineExperiment size={16} /></span> Modelo Predictivo
                            </button>
                            <button className={`nav-item ${isActive("/admin-segmentos")}`} onClick={() => goTo("/admin-segmentos")}>
                                <span className="nav-icon"><AiOutlineUsergroupAdd size={16} /></span> Segmentos
                            </button>
                        </>
                    ) : userRole === 'trabajador' ? (
                        <>
                            <button className={`nav-item ${isActive("/dashboard-trabajador")}`} onClick={() => goTo("/dashboard-trabajador")}>
                                <span className="nav-icon"><AiOutlineDashboard size={16} /></span> Dashboard
                            </button>
                            <button className={`nav-item ${isActive("/pedidos-admin")}`} onClick={() => goTo("/pedidos-admin")}>
                                <span className="nav-icon"><AiOutlineShoppingCart size={16} /></span> Gestión de Pedidos
                            </button>
                            <button className={`nav-item ${isActive("/apartados-admin")}`} onClick={() => goTo("/apartados-admin")}>
                                <span className="nav-icon"><AiOutlineFlag size={16} /></span> Gestión de Apartados
                            </button>
                            <div className="sidebar-divider"></div>
                            <button className={`nav-item ${isActive("/trabajador/actividades")}`} onClick={() => goTo("/trabajador/actividades")}>
                                <span className="nav-icon"><AiOutlineCheckSquare size={16} /></span> Mis Actividades
                            </button>
                            <button className={`nav-item ${isActive("/trabajador/perfil")}`} onClick={() => goTo("/trabajador/perfil")}>
                                <span className="nav-icon"><AiOutlineUser size={16} /></span> Mi Perfil
                            </button>
                        </>
                    ) : (
                        <>
                            <button className={`nav-item ${isActive("/inicio")}`} onClick={() => goTo("/inicio")}>
                                <span className="nav-icon"><AiOutlineHome size={16} /></span> Inicio
                            </button>
                            <button className={`nav-item ${isActive("/catalogo")}`} onClick={() => goTo("/catalogo")}>
                                <span className="nav-icon"><AiOutlineShop size={16} /></span> Catálogo
                            </button>
                            <button className={`nav-item ${isActive("/pedidos")}`} onClick={() => goTo("/pedidos")}>
                                <span className="nav-icon"><AiOutlineFileText size={16} /></span> Mis Pedidos
                            </button>
                            <button className={`nav-item ${isActive("/mis-apartados")}`} onClick={() => goTo("/mis-apartados")}>
                                <span className="nav-icon"><AiOutlineFlag size={16} /></span> Mis Apartados
                            </button>
                            <button className={`nav-item ${isActive("/favoritos")}`} onClick={() => goTo("/favoritos")}>
                                <span className="nav-icon"><AiOutlineHeart size={16} /></span> Mis Favoritos
                            </button>
                            <button className={`nav-item ${isActive("/carrito")}`} onClick={() => goTo("/carrito")}>
                                <span className="nav-icon"><AiOutlineShoppingCart size={16} /></span>
                                Mi Carrito
                                {cartCount > 0 && (
                                    <span className="nav-badge" style={{ marginLeft: 'auto' }}>
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                            <div className="sidebar-divider"></div>
                            <button className={`nav-item ${isActive("/sobre-nosotros")}`} onClick={() => goTo("/sobre-nosotros")}>
                                <span className="nav-icon"><AiOutlineBook size={16} /></span> Sobre nosotros
                            </button>
                            <button className={`nav-item ${isActive("/ubicacion")}`} onClick={() => goTo("/ubicacion")}>
                                <span className="nav-icon"><AiOutlineEnvironment size={16} /></span> Ubicación Física
                            </button>
                            <button className={`nav-item ${isActive("/ayuda")}`} onClick={() => goTo("/ayuda")}>
                                <span className="nav-icon"><AiOutlineTool size={16} /></span> Centro de Ayuda
                            </button>
                        </>
                    )}

                    <div className="sidebar-divider"></div>
                    <button className="nav-item logout-item" onClick={logout}>
                        <span className="nav-icon"><AiOutlineLogout size={16} /></span> Cerrar Sesión
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
                <div className="header-acciones-derecha">
                    {userRole === 'cliente' && (
                        <button
                            className="header-notif-btn"
                            onClick={() => navigate('/notificaciones')}
                            aria-label="Notificaciones"
                            title="Notificaciones"
                        >
                            <AiOutlineBell size={17} />
                            {noLeidas > 0 && <span className="header-notif-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>}
                        </button>
                    )}
                    <div
                        className="user-profile-info"
                        onClick={() => navigate(userRole === 'admin' ? "/admin-perfil" : userRole === 'trabajador' ? "/trabajador/perfil" : "/perfil")}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="user-avatar" style={{ position: 'relative' }}>
                            {user?.nombre?.charAt(0).toUpperCase() || "U"}
                            {userRole === 'admin' && solicitudesPendientes > 0 && (
                                <span className="avatar-badge">{solicitudesPendientes}</span>
                            )}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user?.nombre || 'Mi Perfil'}</span>
                            <span className="user-role">
                                {userRole === 'admin' ? "Administrador" : userRole === 'trabajador' ? "Trabajador" : "Cliente"}
                            </span>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default HeaderPrivado;