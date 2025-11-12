// Ruta:Joyeria-Diana-Laura/Frontend/src/screens/InicioScreen.tsx

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import "../styles/InicioScreen.css";

export default function InicioScreen() {
    const { user, logout } = useAuth();
    
    return (
        <div className="inicio-container">
            {/* Header */}
            <header className="inicio-header">
                <div className="header-content">
                    <div className="logo">
                        <span className="logo-initials">DL</span>
                        <span className="logo-name">Diana Laura</span>
                    </div>
                    <nav className="nav-menu">
                        <a href="#inicio" className="nav-link active">Inicio</a>
                        <a href="#colecciones" className="nav-link">Colecciones</a>
                        <a href="#personalizados" className="nav-link">Personalizados</a>
                        <a href="#nosotros" className="nav-link">Sobre Nosotros</a>
                        <a href="#contacto" className="nav-link">Contacto</a>
                    </nav>
                    <div className="user-actions">
                        <span className="user-welcome">Hola, {user?.nombre}</span>
                        <button className="logout-btn" onClick={logout}>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Elegancia que brilla contigo
                    </h1>
                    <p className="hero-description">
                        Joyería pensada para mantenerse que impactes. Diseño delicado, 
                        acabados de aire cabidal y un estilo femenino contemporáneo.
                    </p>
                    <div className="hero-buttons">
                        <button className="btn-primary">
                            Descubre nuestras Colecciones
                        </button>
                        <button className="btn-secondary">
                            Pide tu diseño
                        </button>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="jewelry-showcase">
                        <div className="jewel-item"></div>
                        <div className="jewel-item"></div>
                        <div className="jewel-item"></div>
                    </div>
                </div>
            </section>

            {/* Quick Stats */}
            <section className="stats-section">
                <div className="stats-container">
                    <div className="stat-card">
                        <h3 className="stat-number">500+</h3>
                        <p className="stat-label">Diseños Exclusivos</p>
                    </div>
                    <div className="stat-card">
                        <h3 className="stat-number">1K+</h3>
                        <p className="stat-label">Clientes Satisfechos</p>
                    </div>
                    <div className="stat-card">
                        <h3 className="stat-number">5+</h3>
                        <p className="stat-label">Años de Experiencia</p>
                    </div>
                    <div className="stat-card">
                        <h3 className="stat-number">100%</h3>
                        <p className="stat-label">Hecho a Mano</p>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="features-section">
                <div className="section-header">
                    <h2 className="section-title">Nuestras Colecciones</h2>
                    <p className="section-subtitle">Descubre piezas únicas elaboradas con pasión y dedicación</p>
                </div>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">💍</div>
                        <h3 className="feature-title">Anillos</h3>
                        <p className="feature-description">
                            Diseños exclusivos que realzan la belleza de tus manos
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📿</div>
                        <h3 className="feature-title">Collares</h3>
                        <p className="feature-description">
                            Piezas que acentúan tu elegancia y personalidad
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">💫</div>
                        <h3 className="feature-title">Aretes</h3>
                        <p className="feature-description">
                            Detalles que iluminan tu rostro con estilo único
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">✨</div>
                        <h3 className="feature-title">Conjuntos</h3>
                        <p className="feature-description">
                            Sets coordinados para ocasiones especiales
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="inicio-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <div className="logo">
                            <span className="logo-initials">DL</span>
                            <span className="logo-name">Diana Laura</span>
                        </div>
                        <p className="footer-tagline">
                            Joyería y Bisutería con esencia femenina
                        </p>
                    </div>
                    <div className="footer-links">
                        <div className="link-group">
                            <h4>Colecciones</h4>
                            <a href="#anillos">Anillos</a>
                            <a href="#collares">Collares</a>
                            <a href="#aretes">Aretes</a>
                            <a href="#pulseras">Pulseras</a>
                        </div>
                        <div className="link-group">
                            <h4>Empresa</h4>
                            <a href="#nosotros">Sobre Nosotros</a>
                            <a href="#contacto">Contacto</a>
                            <a href="#personalizados">Diseños Personalizados</a>
                        </div>
                        <div className="link-group">
                            <h4>Legal</h4>
                            <a href="#privacidad">Política de Privacidad</a>
                            <a href="#terminos">Términos y Condiciones</a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2025 Diana Laura - Joyería y Bisutería. Todos los derechos reservados.</p>
                    <div className="social-links">
                        <a href="#" className="social-link">📱</a>
                        <a href="#" className="social-link">📷</a>
                        <a href="#" className="social-link">👤</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}