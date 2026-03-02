import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { Link } from "react-router-dom";
// ¡IMPORTANTE! Asegúrate de importar carruselAPI, promocionesAPI y productsAPI
import { contentAPI, carruselAPI, promocionesAPI, productsAPI } from "../../services/api";
import "./InicioPublicScreen.css";

const InicioPublicScreen: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // ── ESTADOS DE CARGA Y DATOS DINÁMICOS ──
  const [initialLoading, setInitialLoading] = useState(true);
  const [slides, setSlides] = useState<any[]>([]);
  const [promociones, setPromociones] = useState<any[]>([]);
  const [productosDestacados, setProductosDestacados] = useState<any[]>([]);
  const [noticiasHome, setNoticiasHome] = useState<any[]>([]);

  // ── DATOS DE RESPALDO (Fallbacks) ──
  const defaultSlides = [
    {
      id: 's1',
      tag: "Nueva Colección",
      titulo: "Colección De Oro",
      descripcion: "Piezas únicas forjadas en oro de 18 quilates para quienes buscan el brillo eterno.",
      imagen: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1400&q=85&fit=crop",
    },
    {
      id: 's2',
      tag: "Tendencia 2026",
      titulo: "Colección De Plata",
      descripcion: "Elegancia contemporánea en plata esterlina con acabados artesanales.",
      imagen: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1400&q=85&fit=crop",
    }
  ];

  const defaultNews = [
    {
      id: 'd1',
      titulo: "Lanzamiento Colección Primavera",
      contenido: "Descubre nuestra nueva línea inspirada en los tonos florales de la primavera. Diseños frescos y elegantes.",
      imagen: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80&fit=crop"
    }
  ];

  // ── OBTENER DATOS DEL BACKEND ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Carrusel
        try {
          const carruselRes = await carruselAPI.getAll();
          if (carruselRes && carruselRes.length > 0) {
            setSlides(carruselRes);
          } else {
            setSlides(defaultSlides);
          }
        } catch (e) { setSlides(defaultSlides); }

        // 2. Promociones
        try {
          const promoRes = await promocionesAPI.getAll();
          if (promoRes) {
            setPromociones(promoRes.filter((p: any) => p.activa));
          }
        } catch (e) { console.log("Sin promociones"); }

        // 3. Productos Destacados (Últimos 4)
        try {
          const prodRes = await productsAPI.getAll();
          let prods = [];
          if (Array.isArray(prodRes)) prods = prodRes;
          else if (prodRes && Array.isArray(prodRes.data)) prods = prodRes.data;
          
          if (prods.length > 0) {
            setProductosDestacados(prods.slice(0, 4));
          }
        } catch (e) { console.log("Error cargando productos"); }

        // 4. Noticias
        try {
          const noticiasRes = await contentAPI.getNoticias();
          if (noticiasRes && noticiasRes.length > 0) {
            const activas = noticiasRes.filter((n: any) => n.activa);
            setNoticiasHome(activas.slice(0, 3));
          } else {
            setNoticiasHome(defaultNews);
          }
        } catch (e) { setNoticiasHome(defaultNews); }

      } catch (error) {
        console.error("Error global conectando con la BD");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── INTERVALO DEL CARRUSEL ──
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  // ── PANTALLA DE CARGA ──
  if (initialLoading) {
    return (
      <div className="inicio-public-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <PublicHeader />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="noticias-loading">
            <div className="loading-spinner">
              <div className="spinner-ring" />
              <div className="spinner-ring spinner-ring--2" />
              <div className="spinner-dot" />
            </div>
            <p className="loading-text" style={{ marginTop: '1.5rem' }}>Preparando la experiencia...</p>
            <div className="loading-dots"><span /><span /><span /></div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="inicio-public-container">
      <PublicHeader />

      {/* ═══════════ CAROUSEL DINÁMICO ═══════════ */}
      <section className="carousel-section">
        <div className="carousel-container">
          <div className="carousel-wrapper">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`carousel-slide ${index === currentSlide ? "active" : ""}`}
                style={{ backgroundImage: `url(${slide.imagen || slide.image})` }}
              >
                <div className="carousel-overlay" />
                <div className="carousel-content">
                  <span className="carousel-tag">{slide.tag || "Exclusivo"}</span>
                  <h3 className="carousel-title">{slide.titulo || slide.title}</h3>
                  <p className="carousel-desc">{slide.descripcion || slide.description}</p>
                  {slide.enlace && (
                    <Link to={slide.enlace} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                      Explorar
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="carousel-btn carousel-btn-prev" onClick={prevSlide} aria-label="Anterior">❮</button>
          <button className="carousel-btn carousel-btn-next" onClick={nextSlide} aria-label="Siguiente">❯</button>

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
              <h1 className="hero-title">Elegancia que <span>brilla</span> contigo</h1>
              <p className="hero-subtitle">
                Joyería pensada para quienes aprecian lo extraordinario. Diseño delicado,
                acabados únicos y un estilo femenino contemporáneo que te acompaña en cada momento.
              </p>
              <div className="hero-buttons">
                <Link to="/catalogo-publico" className="btn btn-primary">Descubre nuestras Colecciones</Link>
                <button className="btn btn-secondary">Pide tu diseño</button>
              </div>
            </div>

            <div className="hero-images">
              <div className="image-grid">
                <div className="image-item img-1"><img src="https://imagenes.eleconomista.com.mx/files/webp_768_448/uploads/2023/09/10/66e49dd38c8bc.jpeg" alt="Joyería" loading="lazy" /></div>
                <div className="image-item img-2"><img src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80&fit=crop" alt="Anillos" loading="lazy" /></div>
                <div className="image-item img-3"><img src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80&fit=crop" alt="Collares" loading="lazy" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ NUEVO: PRODUCTOS DESTACADOS ═══════════ */}
      {/* Reutilizamos las clases de news-section para mantener el estilo exacto */}
      {productosDestacados.length > 0 && (
        <section className="news-section" style={{ backgroundColor: 'var(--bg-card-h)' }}>
          <div className="container-lg">
            <div className="section-header text-center mb-5">
              <span className="section-label" style={{ margin: '0 auto' }}>Nuestro Catálogo</span>
              <h2 className="section-title">Piezas <span>Exclusivas</span></h2>
              <p className="section-subtitle">Descubre los productos favoritos de nuestras clientas</p>
            </div>

            <div className="news-grid">
              {productosDestacados.map(prod => (
                <div className="news-card" key={prod.id}>
                  <div className="news-image">
                    <img src={prod.imagen || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80"} alt={prod.nombre} loading="lazy" />
                  </div>
                  <div className="news-content" style={{ textAlign: 'center' }}>
                    <h5 className="news-title">{prod.nombre}</h5>
                    <p className="news-description" style={{ color: 'var(--rose)', fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                      ${Number(prod.precio).toFixed(2)}
                    </p>
                    <div className="news-divider" style={{ margin: '1.2rem auto' }} />
                    <Link to={`/producto/${prod.id}`} className="btn btn-secondary" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
                      Ver Detalles
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-5">
              <Link to="/catalogo-publico" className="btn btn-primary">Ver todo el catálogo</Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ NUEVO: PROMOCIONES ═══════════ */}
      {/* Reutilizamos las clases de features-section para mantener el diseño limpio */}
      {promociones.length > 0 && (
        <section className="features-section">
          <div className="container-lg">
            <div className="section-header text-center mb-5">
              <span className="section-label" style={{ margin: '0 auto' }}>Ofertas Especiales</span>
              <h2 className="section-title">Promociones <span>Activas</span></h2>
            </div>

            <div className="features-grid">
              {promociones.map(promo => (
                <div className="feature-card" key={promo.id} style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--rose-border)' }}>
                  {/* Etiqueta roja de descuento en la esquina */}
                  <div style={{ position: 'absolute', top: '15px', right: '-35px', background: 'var(--rose-vivid)', color: '#fff', padding: '0.3rem 3rem', transform: 'rotate(45deg)', fontWeight: 'bold', fontSize: '0.85rem', zIndex: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                    -{promo.descuento}%
                  </div>
                  <div className="feature-icon"><i className="fas fa-tags" style={{ color: 'var(--rose)' }} /></div>
                  <h4 style={{ color: 'var(--rose-light)' }}>{promo.titulo}</h4>
                  <p>{promo.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ FEATURES ═══════════ */}
      <section className="features-section" style={{ borderTop: '1px solid var(--rose-soft)' }}>
        <div className="container-lg">
          <div className="section-header text-center mb-5">
            <span className="section-label" style={{ margin: '0 auto' }}>Por qué elegirnos</span>
            <h2 className="section-title">Lo que nos hace <span>especiales</span></h2>
            <p className="section-subtitle">Cada detalle importa, cada pieza cuenta una historia</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-gem" /></div>
              <h4>Diseño Premium</h4>
              <p>Cada pieza es cuidadosamente diseñada con materiales de alta calidad y atención al detalle.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-heart" /></div>
              <h4>Hecho con Amor</h4>
              <p>Creado con pasión artesanal y dedicación en cada proceso de fabricación.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-headset" /></div>
              <h4>Soporte 24/7</h4>
              <p>Nuestro equipo está disponible para ayudarte en cualquier momento que lo necesites.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-truck" /></div>
              <h4>Envío Rápido</h4>
              <p>Entrega segura y rápida a cualquier lugar, con seguimiento en tiempo real.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ NOTICIAS DINÁMICAS ═══════════ */}
      <section className="news-section">
        <div className="container-lg">
          <div className="section-header text-center mb-5">
            <span className="section-label" style={{ margin: '0 auto' }}>Últimas novedades</span>
            <h2 className="section-title">Noticias &amp; <span>Novedades</span></h2>
            <p className="section-subtitle">Mantente al día con nuestras últimas colecciones y promociones</p>
          </div>

          <div className="news-grid">
            {noticiasHome.map((noticia) => (
              <div className="news-card" key={noticia.id}>
                <div className="news-image">
                  <img
                    src={noticia.imagen || "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80"}
                    alt={noticia.titulo}
                    loading="lazy"
                  />
                </div>
                <div className="news-content">
                  <h5 className="news-title">{noticia.titulo}</h5>
                  <p className="news-description">
                    {noticia.contenido && noticia.contenido.length > 100 
                      ? `${noticia.contenido.substring(0, 100)}...` 
                      : noticia.contenido}
                  </p>
                  <div className="news-divider" />
                  <Link to={`/noticias`} className="news-link">
                    Leer más <span className="news-link-arrow">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-5">
            <Link to="/noticias" className="btn btn-primary">Ver todas las noticias</Link>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="cta-section">
        <div className="container-lg">
          <div className="cta-content">
            <p className="cta-label">Tu joyería exclusiva</p>
            <h2>¿Lista para encontrar tu <span>joya perfecta</span>?</h2>
            <p>Explora nuestro catálogo completo y encuentra las piezas que mejor se adapten a tu estilo único.</p>
            <Link to="/catalogo-publico" className="btn btn-primary btn-lg">Explorar Catálogo</Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default InicioPublicScreen;