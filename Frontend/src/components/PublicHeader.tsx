import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AiOutlineSearch, AiOutlinePhone, AiOutlineMessage, AiOutlineInfoCircle } from "react-icons/ai";
import "../styles/PublicHeader.css";

const PublicHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // El buscador lleva al catálogo con el término en la URL, para que la
  // búsqueda se pueda compartir y funcione con el botón de atrás.
  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busqueda.trim();
    navigate(q ? `/catalogo-publico?buscar=${encodeURIComponent(q)}` : "/catalogo-publico");
  };

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
      {/* ── BARRA UTILITARIA ──
          Franja delgada por encima del logo con los datos de contacto, como
          en las tiendas grandes. Se oculta en móvil para no robarle alto a
          la pantalla. */}
      <div className="header-utilidad">
        <div className="container-lg header-utilidad-inner">
          <span className="header-utilidad-lema">Tu joyería artesanal en Huejutla</span>
          <div className="header-utilidad-enlaces">
            <a href="tel:+527715551234" className="header-utilidad-link">
              <AiOutlinePhone size={13} aria-hidden="true" /> 771 555 1234
            </a>
            <Link to="/ayuda-publica" className="header-utilidad-link">
              <AiOutlineMessage size={13} aria-hidden="true" /> Ayuda
            </Link>
            <Link to="/contacto-publico" className="header-utilidad-link">
              <AiOutlineInfoCircle size={13} aria-hidden="true" /> Quiénes somos
            </Link>
          </div>
        </div>
      </div>

      <div className="container-lg">
        <div className="header-content">

          {/* Logo y marca */}
          <div className="header-brand">
            <Link to="/" className="brand-link">
              <span className="brand-initials">DL</span>
              <span className="brand-name">Diana Laura</span>
            </Link>
          </div>

          {/* ── BUSCADOR ──
              Caja ancha entre el logo y el acceso, como en las tiendas. */}
          <form className="header-buscador" role="search" onSubmit={handleBuscar}>
            <label htmlFor="buscador-publico" className="sr-only">
              Buscar piezas en el catálogo
            </label>
            <input
              id="buscador-publico"
              type="search"
              className="header-buscador-input"
              placeholder="Buscar anillos, collares, pulseras…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="header-buscador-btn" aria-label="Buscar">
              <AiOutlineSearch size={18} />
            </button>
          </form>

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
        <Link to="/login" className="pub-nav-mobile-acceso" onClick={() => setMenuOpen(false)}>
          Acceso
        </Link>
      </nav>
    </header>
  );
};

export default PublicHeader;