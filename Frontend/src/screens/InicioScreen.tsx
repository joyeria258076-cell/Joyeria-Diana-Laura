// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/InicioScreen.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/InicioScreen.css";
import FooterPrivado from "../components/FooterPrivado"; 

const InicioScreen: React.FC = () => {
    const navigate = useNavigate();
    
    return (
        <div className="inicio-container">
            {/* 1. SECCIÓN HERO */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">Elegancia que brilla contigo</h1>
                    <p className="hero-description">
                        Joyería pensada para que impactes. Diseño delicado, 
                        acabados de alta calidad y un estilo femenino contemporáneo.
                    </p>
                    <div className="hero-buttons">
                        <button className="btn-primary" onClick={() => navigate("/catalogo")}>
                            Descubre nuestras Colecciones
                        </button>
                        <button className="btn-secondary" onClick={() => navigate("/contacto")}>
                            Pide tu diseño
                        </button>
                    </div>
                </div>
                
                <div className="hero-visual">
                    <div className="jewelry-showcase">
                        <div className="jewel-item">💍</div>
                        <div className="jewel-item">✨</div>
                        <div className="jewel-item">💎</div>
                    </div>
                </div>
            </section>

            {/* 2. SECCIÓN DE EXPLORACIÓN (Categorías + Destacados) */}
            <section className="catalog-preview-section">
                <div className="section-header-block">
                    <h2 className="section-title-elegant">Explora por Categorías</h2>
                    <div className="categories-container-styled">
                        <button className="cat-chip active">Todas</button>
                        <button className="cat-chip">Anillos</button>
                        <button className="cat-chip">Collares</button>
                        <button className="cat-chip">Aretes</button>
                        <button className="cat-chip">Pulseras</button>
                    </div>
                </div>

                {/* Título de Productos Destacados (Lo que faltaba) */}
                <div className="featured-header">
                    <h2 className="section-title-elegant">Productos Destacados</h2>
                    <div className="title-underline"></div>
                </div>

                {/* 3. GRID DE PRODUCTOS */}
                <div className="products-grid-styled">
                    {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="product-card-styled">
                            <div className="product-image-placeholder">
                                <span className="icon-placeholder">💎</span>
                            </div>
                            <div className="product-info-styled">
                                <h3>Producto Exclusivo</h3>
                                <p>Descripción breve del diseño y materiales.</p>
                                <span className="price-tag">$0.00</span>
                                <div className="card-actions-styled">
                                    <button className="btn-detail">Ver Detalle</button>
                                    <button className="btn-cart-icon">🛒</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. SECCIÓN DE ESTADÍSTICAS */}
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
                        <h3 className="stat-number">100%</h3>
                        <p className="stat-label">Hecho a Mano</p>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default InicioScreen;