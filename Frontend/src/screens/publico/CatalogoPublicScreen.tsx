import React from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import "./CatalogoPublicScreen.css";

const CatalogoPublicScreen: React.FC = () => {
  const productos = [
    { id: 1, nombre: "Arete Clásico", categoria: "Aretes" },
    { id: 2, nombre: "Collar Minimalista", categoria: "Collares" },
    { id: 3, nombre: "Pulsera Dorada", categoria: "Pulseras" },
    { id: 4, nombre: "Anillo Elegante", categoria: "Anillos" },
    { id: 5, nombre: "Arete Premium", categoria: "Aretes" },
    { id: 6, nombre: "Collar Vintage", categoria: "Collares" },
    { id: 7, nombre: "Pulsera Plateada", categoria: "Pulseras" },
    { id: 8, nombre: "Anillo Moderno", categoria: "Anillos" },
  ];

  const categorias = ["Todos", "Aretes", "Collares", "Pulseras", "Anillos"];

  return (
    <div className="catalogo-public-container">
      <PublicHeader />

      {/* HERO SECTION */}
      <section className="catalogo-hero">
        <div className="container-lg">
          <h1 className="catalogo-title">Nuestro Catálogo</h1>
          <p className="catalogo-subtitle">
            Explora nuestras colecciones de joyería premium
          </p>
        </div>
      </section>

      {/* FILTROS Y CATÁLOGO */}
      <section className="catalogo-section">
        <div className="container-lg">
          {/* Filtros */}
          <div className="filter-section">
            <div className="filter-buttons">
              {categorias.map((cat, index) => (
                <button
                  key={index}
                  className={`filter-btn ${index === 0 ? "active" : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de productos */}
          <div className="productos-grid">
            {productos.map((producto) => (
              <div key={producto.id} className="producto-card">
                <div className="producto-image"></div>
                <div className="producto-info">
                  <h4 className="producto-nombre">{producto.nombre}</h4>
                  <p className="producto-categoria">{producto.categoria}</p>
                  <div className="producto-footer">
                    <span className="producto-precio">$XX.XX</span>
                    <button className="btn-agregar">
                      <i className="fas fa-shopping-bag"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default CatalogoPublicScreen;
