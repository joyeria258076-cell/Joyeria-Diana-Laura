import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import SelectorTema from "./SelectorTema";
import "../styles/PublicHeader.css";

const PublicHeader: React.FC = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string): boolean => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path;
  };

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Evitar scroll del body cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const links = [
    { to: "/",                label: "Inicio" },
    { to: "/catalogo-publico", label: "Catálogo" },
    { to: "/noticias",         label: "Blog" },
    { to: "/contacto-publico", label: "Contacto" },
    { to: "/ubicacion-publica",label: "Ubicación" },
    { to: "/ayuda-publica",    label: "Ayuda" },
    { to: "/legal/terminos",   label: "Legal" },
  ];

  return (
    <header className="public-header">
      <div className="container-lg">
        <div className="header-content">

          {/* Logo y marca */}
          <div className="header-brand">
            <Link to="/" className="brand-link">
              <img className="brand-logo" src="/pwa-192.png" alt="" width={44} height={44} />
              <span className="brand-name"><small>Joyería</small> Diana Laura</span>
            </Link>
          </div>

          {/* Navegación — desktop */}
          <nav className="header-nav">
            {links.map(l => (
              <Link key={l.to} to={l.to} className={`nav-link ${isActive(l.to) ? "active" : ""}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Botón de acceso — desktop */}
          <div className="header-auth hide-mobile">
            <SelectorTema compacto />
            <Link to="/login" className="btn-acceso">Acceso</Link>
          </div>

          {/* Botón hamburguesa — solo móvil */}
          <button
            className="public-hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
            aria-expanded={menuOpen}
          >
            <span className={`pub-ham-line${menuOpen ? ' open' : ''}`}></span>
            <span className={`pub-ham-line${menuOpen ? ' open' : ''}`}></span>
            <span className={`pub-ham-line${menuOpen ? ' open' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Overlay móvil */}
      {menuOpen && (
        <div className="pub-nav-overlay" onClick={() => setMenuOpen(false)} />
      )}

      {/* Menú desplegable móvil */}
      <nav className={`pub-nav-mobile${menuOpen ? ' open' : ''}`}>
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className={`pub-nav-mobile-link ${isActive(l.to) ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        <div className="pub-nav-mobile-tema"><SelectorTema /></div>
        <Link to="/login" className="pub-nav-mobile-acceso" onClick={() => setMenuOpen(false)}>
          Acceso
        </Link>
      </nav>
    </header>
  );
};

export default PublicHeader;