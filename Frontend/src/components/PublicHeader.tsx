import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/PublicHeader.css";

const PublicHeader: React.FC = () => {
  const location = useLocation();

  // Función para determinar si un enlace está activo
  const isActive = (path: string): boolean => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname === path;
  };

  return (
    <header className="public-header">
      <div className="container-lg">
        <div className="header-content">
          {/* Logo y marca */}
          <div className="header-brand">
            <Link to="/" className="brand-link">
              <span className="brand-initials">DL</span>
              <span className="brand-name">Diana Laura</span>
            </Link>
          </div>

          {/* Navegación principal */}
          <nav className="header-nav">
            <Link 
              to="/" 
              className={`nav-link ${isActive("/") ? "active" : ""}`}
            >
              Inicio
            </Link>
            <Link 
              to="/catalogo-publico" 
              className={`nav-link ${isActive("/catalogo-publico") ? "active" : ""}`}
            >
              Catálogo
            </Link>
            <Link 
              to="/noticias" 
              className={`nav-link ${isActive("/noticias") ? "active" : ""}`}
            >
              Noticias
            </Link>
            <Link 
              to="/contacto-publico" 
              className={`nav-link ${isActive("/contacto-publico") ? "active" : ""}`}
            >
              Contacto
            </Link>
          </nav>

          {/* Botón de acceso */}
          <div className="header-auth">
            <Link to="/login" className="btn-acceso">
              Acceso
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
