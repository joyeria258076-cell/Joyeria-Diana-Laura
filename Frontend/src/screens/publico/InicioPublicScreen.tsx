import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { Link } from "react-router-dom";
import "./InicioPublicScreen.css";

const InicioPublicScreen: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Array de slides con imágenes
  const slides = [
    { 
      id: 1, 
      title: "Colección De Oro", 
      description: "Brillo eterno",
      image: "https://www.joyeriasanchez.com/blog/wp-content/uploads/2024/04/como-saber-si-una-joya-es-de-oro.jpg" 
    },
    { 
      id: 2, 
      title: "Colección De Plata", 
      description: "Elegancia pura",
      image: "https://lluviadeplata.pe/wp-content/uploads/2024/06/pulseras-de-plata-con-dijes-scaled.jpg"
    },
    { 
      id: 3, 
      title: "Colección Piedras", 
      description: "Brillantes naturales",
      image: "https://cdn.faire.com/fastly/84680924eebaae6636fe47f170892a3deb37717b05813d931fb79ec0ef87e390.jpeg?bg-color=FFFFFF&dpr=1&fit=crop&format=jpg&height=720&precrop=2000,2000,x0,y493,safe&width=720"
    },
    { 
      id: 4, 
      title: "Colección Anillos", 
      description: "Para momentos especiales",
      image: "https://www.joyeriasanchez.com/blog/wp-content/uploads/2024/04/Tipos-de-anillos-de-una-relacion.jpg"
    },
  ];

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="inicio-public-container">
      <PublicHeader />

      {/* CAROUSEL SECTION */}
      <section className="carousel-section">
        <div className="carousel-container">
          <div className="carousel-wrapper">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`carousel-slide ${index === currentSlide ? "active" : ""}`}
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="carousel-overlay"></div>
                <div className="carousel-content">
                  <h3 className="carousel-title">{slide.title}</h3>
                  <p className="carousel-desc">{slide.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation buttons */}
          <button className="carousel-btn carousel-btn-prev" onClick={prevSlide} aria-label="Anterior">
            ❮
          </button>
          <button className="carousel-btn carousel-btn-next" onClick={nextSlide} aria-label="Siguiente">
            ❯
          </button>

          {/* Dots indicadores */}
          <div className="carousel-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                className={`carousel-dot ${index === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Diapositiva ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="hero-section">
        <div className="container-lg">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">Elegancia que brilla contigo</h1>
              <p className="hero-subtitle">
                Joyería pensada para mantenerte impacto. Diseño delicado, acabados
                de aire cálido y un estilo femenino contemporáneo.
              </p>
              <div className="hero-buttons">
                <Link to="/catalogo-publico" className="btn btn-primary">
                  Descubre nuestras Colecciones
                </Link>
                <button className="btn btn-secondary">Pide tu diseño</button>
              </div>
            </div>

            <div className="hero-images">
              <div className="image-grid">
                <div className="image-item img-1"></div>
                <div className="image-item img-2"></div>
                <div className="image-item img-3"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE CARACTERÍSTICAS */}
      <section className="features-section">
        <div className="container-lg">
          <div className="text-center mb-5">
            <h2 className="section-title">Por qué elegirnos</h2>
            <p className="section-subtitle">
              Descubre lo que nos hace especiales
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-gem"></i>
              </div>
              <h4>Diseño Premium</h4>
              <p>Cada pieza es cuidadosamente diseñada con materiales de alta calidad</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-heart"></i>
              </div>
              <h4>Hecho con Amor</h4>
              <p>Creado con pasión y atención al detalle en cada pieza</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-headset"></i>
              </div>
              <h4>Soporte 24/7</h4>
              <p>Estamos aquí para ayudarte en cualquier momento</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-truck"></i>
              </div>
              <h4>Envío Rápido</h4>
              <p>Entrega segura y rápida a cualquier lugar</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE NOTICIAS */}
      <section className="news-section">
        <div className="container-lg">
          <div className="text-center mb-5">
            <h2 className="section-title">Noticias y Novedades</h2>
            <p className="section-subtitle">
              Mantente al día con nuestras últimas colecciones y promociones
            </p>
          </div>

          <div className="news-grid">
            {/* Noticia 1 */}
            <div className="news-card">
              <div className="news-image"></div>
              <div className="news-content">
                <h5 className="news-title">Lanzamiento Colección Primavera</h5>
                <p className="news-description">
                  Descubre nuestra nueva línea inspirada en los tonos florales de
                  la primavera. Diseños frescos y elegantes.
                </p>
                <Link to="/noticias" className="news-link">
                  Leer más →
                </Link>
              </div>
            </div>

            {/* Noticia 2 */}
            <div className="news-card">
              <div className="news-image"></div>
              <div className="news-content">
                <h5 className="news-title">Promoción Especial: 20% OFF</h5>
                <p className="news-description">
                  En toda nuestra colección de aretes y collares. Válido hasta fin
                  de mes en compras online.
                </p>
                <Link to="/noticias" className="news-link">
                  Leer más →
                </Link>
              </div>
            </div>

            {/* Noticia 3 */}
            <div className="news-card">
              <div className="news-image"></div>
              <div className="news-content">
                <h5 className="news-title">Materiales Sostenibles</h5>
                <p className="news-description">
                  Nos comprometemos con el medio ambiente. Nuestras nuevas
                  colecciones utilizan materiales eco-amigables.
                </p>
                <Link to="/noticias" className="news-link">
                  Leer más →
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center mt-5">
            <Link to="/noticias" className="btn btn-primary">
              Ver todas las noticias
            </Link>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section">
        <div className="container-lg">
          <div className="cta-content">
            <h2>¿Listo para encontrar tu joya perfecta?</h2>
            <p>
              Explora nuestro catálogo completo y encuentra las piezas que mejor
              se adapten a tu estilo.
            </p>
            <Link to="/catalogo-publico" className="btn btn-primary btn-lg">
              Explorar Catálogo
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default InicioPublicScreen;
