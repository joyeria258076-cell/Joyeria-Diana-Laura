import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { Link } from "react-router-dom";
import "./InicioPublicScreen.css";

const InicioPublicScreen: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      tag: "Nueva Colección",
      title: "Colección De Oro",
      description: "Piezas únicas forjadas en oro de 18 quilates para quienes buscan el brillo eterno.",
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1400&q=85&fit=crop",
    },
    {
      id: 2,
      tag: "Tendencia 2026",
      title: "Colección De Plata",
      description: "Elegancia contemporánea en plata esterlina con acabados artesanales.",
      image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1400&q=85&fit=crop",
    },
    {
      id: 3,
      tag: "Exclusivo",
      title: "Colección Piedras",
      description: "Brillantes naturales seleccionados a mano para quienes merecen lo mejor.",
      image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1400&q=85&fit=crop",
    },
    {
      id: 4,
      tag: "Momentos Especiales",
      title: "Colección Anillos",
      description: "Para los instantes que cambian la vida. Anillos únicos llenos de significado.",
      image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=1400&q=85&fit=crop",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="inicio-public-container">
      <PublicHeader />

      {/* ═══════════ CAROUSEL ═══════════ */}
      <section className="carousel-section">
        <div className="carousel-container">
          <div className="carousel-wrapper">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`carousel-slide ${index === currentSlide ? "active" : ""}`}
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="carousel-overlay" />
                <div className="carousel-content">
                  <span className="carousel-tag">{slide.tag}</span>
                  <h3 className="carousel-title">{slide.title}</h3>
                  <p className="carousel-desc">{slide.description}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="carousel-btn carousel-btn-prev" onClick={prevSlide} aria-label="Anterior">
            ❮
          </button>
          <button className="carousel-btn carousel-btn-next" onClick={nextSlide} aria-label="Siguiente">
            ❯
          </button>

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

      {/* ═══════════ HERO ═══════════ */}
      <section className="hero-section">
        <div className="container-lg">
          <div className="hero-content">

            <div className="hero-text">
              <span className="section-label">Joyería Exclusiva</span>
              <h1 className="hero-title">
                Elegancia que <span>brilla</span> contigo
              </h1>
              <p className="hero-subtitle">
                Joyería pensada para quienes aprecian lo extraordinario. Diseño delicado,
                acabados únicos y un estilo femenino contemporáneo que te acompaña en cada momento.
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
                <div className="image-item img-1">
                  <img
                    src="https://imagenes.eleconomista.com.mx/files/webp_768_448/uploads/2023/09/10/66e49dd38c8bc.jpeg"
                    alt="Joyería exclusiva"
                    loading="lazy"
                  />
                </div>
                <div className="image-item img-2">
                  <img
                    src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80&fit=crop"
                    alt="Colección de anillos"
                    loading="lazy"
                  />
                </div>
                <div className="image-item img-3">
                  <img
                    src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80&fit=crop"
                    alt="Collares elegantes"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section className="features-section">
        <div className="container-lg">
          <div className="section-header text-center mb-5">
            <span className="section-label" style={{ margin: '0 auto' }}>Por qué elegirnos</span>
            <h2 className="section-title">Lo que nos hace <span>especiales</span></h2>
            <p className="section-subtitle">Cada detalle importa, cada pieza cuenta una historia</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-gem" />
              </div>
              <h4>Diseño Premium</h4>
              <p>Cada pieza es cuidadosamente diseñada con materiales de alta calidad y atención al detalle.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-heart" />
              </div>
              <h4>Hecho con Amor</h4>
              <p>Creado con pasión artesanal y dedicación en cada proceso de fabricación.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-headset" />
              </div>
              <h4>Soporte 24/7</h4>
              <p>Nuestro equipo está disponible para ayudarte en cualquier momento que lo necesites.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-truck" />
              </div>
              <h4>Envío Rápido</h4>
              <p>Entrega segura y rápida a cualquier lugar, con seguimiento en tiempo real.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ NEWS ═══════════ */}
      <section className="news-section">
        <div className="container-lg">
          <div className="section-header text-center mb-5">
            <span className="section-label" style={{ margin: '0 auto' }}>Últimas novedades</span>
            <h2 className="section-title">Noticias &amp; <span>Novedades</span></h2>
            <p className="section-subtitle">Mantente al día con nuestras últimas colecciones y promociones</p>
          </div>

          <div className="news-grid">
            <div className="news-card">
              <div className="news-image">
                <img
                  src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80&fit=crop"
                  alt="Colección Primavera"
                  loading="lazy"
                />
              </div>
              <div className="news-content">
                <h5 className="news-title">Lanzamiento Colección Primavera</h5>
                <p className="news-description">
                  Descubre nuestra nueva línea inspirada en los tonos florales de la primavera. Diseños frescos y elegantes.
                </p>
                <div className="news-divider" />
                <Link to="/noticias" className="news-link">
                  Leer más <span className="news-link-arrow">→</span>
                </Link>
              </div>
            </div>

            <div className="news-card">
              <div className="news-image">
                <img
                  src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80&fit=crop"
                  alt="Promoción especial"
                  loading="lazy"
                />
              </div>
              <div className="news-content">
                <h5 className="news-title">Promoción Especial: 20% OFF</h5>
                <p className="news-description">
                  En toda nuestra colección de aretes y collares. Válido hasta fin de mes en compras online.
                </p>
                <div className="news-divider" />
                <Link to="/noticias" className="news-link">
                  Leer más <span className="news-link-arrow">→</span>
                </Link>
              </div>
            </div>

            <div className="news-card">
              <div className="news-image">
                <img
                  src="https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600&q=80&fit=crop"
                  alt="Materiales sostenibles"
                  loading="lazy"
                />
              </div>
              <div className="news-content">
                <h5 className="news-title">Materiales Sostenibles</h5>
                <p className="news-description">
                  Nos comprometemos con el medio ambiente. Nuestras nuevas colecciones utilizan materiales eco-amigables.
                </p>
                <div className="news-divider" />
                <Link to="/noticias" className="news-link">
                  Leer más <span className="news-link-arrow">→</span>
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

      {/* ═══════════ CTA ═══════════ */}
      <section className="cta-section">
        <div className="container-lg">
          <div className="cta-content">
            <p className="cta-label">Tu joyería exclusiva</p>
            <h2>¿Lista para encontrar tu <span>joya perfecta</span>?</h2>
            <p>
              Explora nuestro catálogo completo y encuentra las piezas que mejor se adapten a tu estilo único.
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