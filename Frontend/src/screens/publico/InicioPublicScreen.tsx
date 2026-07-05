import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { Link } from "react-router-dom";
// ¡IMPORTANTE! Asegúrate de importar carruselAPI, promocionesAPI y productsAPI
import { contentAPI, carruselAPI, promocionesAPI, productsAPI, paginasAPI, seccionesAPI, contenidosAPI, coleccionesAPI } from "../../services/api";
import "./InicioPublicScreen.css";

const InicioPublicScreen: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // ── ESTADOS DE CARGA Y DATOS DINÁMICOS ──
  const [initialLoading, setInitialLoading] = useState(true);
  const [slides, setSlides] = useState<any[]>([]);
  const [promociones, setPromociones] = useState<any[]>([]);
  const [productosDestacados, setProductosDestacados] = useState<any[]>([]);
  const [noticiasHome, setNoticiasHome] = useState<any[]>([]);
  const [grupoProductos, setGrupoProductos] = useState(0);
  const [colecciones, setColecciones] = useState<any[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);

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
        // 1. CARRUSEL - Traer datos de la BD (Página Inicio > Sección Carrusel > Contenidos)
        try {
          // Obtener página "Inicio"
          const paginas = await paginasAPI.getAll();
          const paginaInicio = Array.isArray(paginas)
            ? paginas.find((p: any) => p.slug === 'inicio')
            : paginas.data?.find((p: any) => p.slug === 'inicio');

          if (paginaInicio) {
            // Obtener secciones de la página Inicio
            const secciones = await seccionesAPI.getByPagina(paginaInicio.id);
            const seccionesArray = Array.isArray(secciones) ? secciones : secciones.data || [];
            
            // Buscar la sección "carrusel"
            const seccionCarrusel = seccionesArray.find((s: any) => 
              s.nombre?.toLowerCase().includes('carrusel') || 
              s.nombre?.toLowerCase().includes('carousel')
            );

            if (seccionCarrusel) {
              // Obtener contenidos de la sección Carrusel
              const contenidos = await contenidosAPI.getBySeccion(seccionCarrusel.id);
              const contenidosArray = Array.isArray(contenidos) ? contenidos : contenidos.data || [];
              
              // Convertir contenidos a formato de slides
              const slidesFromDB = contenidosArray
                .filter((c: any) => c.activo !== false)
                .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
                .map((c: any) => ({
                  id: c.id.toString(),
                  titulo: c.titulo,
                  tag: c.descripcion ? c.descripcion.split('\n')[0].substring(0, 20) : "Exclusivo",
                  descripcion: c.descripcion || "Descubre nuestras colecciones exclusivas",
                  imagen: c.imagen_url,
                  image: c.imagen_url,
                  enlace: c.enlace_url,
                  enlace_nueva_ventana: c.enlace_nueva_ventana
                }));

              if (slidesFromDB.length > 0) {
                setSlides(slidesFromDB);
              } else {
                setSlides(defaultSlides);
              }
            } else {
              // Si no existe sección de carrusel, usar datos por defecto
              setSlides(defaultSlides);
            }
          } else {
            setSlides(defaultSlides);
          }
        } catch (e) { 
          console.error("Error obteniendo carrusel de BD:", e);
          setSlides(defaultSlides); 
        }

        // 2. Promociones activas
        try {
          const promoRes = await promocionesAPI.getActivas();
          const lista = Array.isArray(promoRes) ? promoRes : (promoRes.data || []);
          setPromociones(lista);
        } catch (e) { console.log("Sin promociones"); }

        // 3. Productos Destacados (Últimos 4)
        try {
          const prodRes = await productsAPI.getAll();
          let prods = [];
          if (Array.isArray(prodRes)) prods = prodRes;
          else if (prodRes && Array.isArray(prodRes.data)) prods = prodRes.data;
          
          if (prods.length > 0) {
            setProductosDestacados(prods);
          }
        } catch (e) { console.log("Error cargando productos"); }

        // 4. Colecciones
        try {
          const resCol = await coleccionesAPI.getPublicas();
          const cols = Array.isArray(resCol) ? resCol : (resCol.data || []);
          setColecciones(cols.filter((c: any) => c.productos?.length > 0));
        } catch { /* sin colecciones */ }

        // 5. Noticias
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

  const totalGrupos = Math.ceil(productosDestacados.length / 4);
  const productosGrupo = productosDestacados.slice(grupoProductos * 4, grupoProductos * 4 + 4);

  useEffect(() => {
    if (totalGrupos <= 1) return;
    const t = setInterval(() => {
      setGrupoProductos(prev => (prev + 1) % totalGrupos);
    }, 6000);
    return () => clearInterval(t);
  }, [totalGrupos]);

  useEffect(() => {
    if (promociones.length <= 1) return;
    const t = setInterval(() => setTickerIdx(prev => (prev + 1) % promociones.length), 4000);
    return () => clearInterval(t);
  }, [promociones.length]);

  const promoLabel = (p: any) => {
    if (p.tipo === 'porcentaje') return `${p.valor_descuento}% de descuento`;
    if (p.tipo === 'monto_fijo') return `$${p.valor_descuento} de descuento`;
    if (p.tipo === '2x1') return '2×1 en productos seleccionados';
    if (p.tipo === 'envio_gratis') return 'Envío gratis';
    if (p.tipo === 'cupon') return `Cupón ${p.codigo_cupon ? p.codigo_cupon + ' — ' : ''}${p.valor_descuento}% off`;
    return p.nombre;
  };

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
      {/* ═══════════ BARRA TICKER PROMOCIONES ═══════════ */}
      {promociones.length > 0 && (
        <div className="promo-ticker">
          <span className="promo-ticker-badge">🏷️ OFERTA</span>
          <div className="promo-ticker-track">
            {promociones.map((p, i) => (
              <span
                key={p.id}
                className={`promo-ticker-item ${i === tickerIdx ? 'promo-ticker-item-active' : ''}`}
              >
                <strong>{p.nombre}</strong> — {promoLabel(p)}
                {p.fecha_fin && (
                  <em> · Válida hasta {new Date(p.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</em>
                )}
              </span>
            ))}
          </div>
          {promociones.length > 1 && (
            <div className="promo-ticker-dots">
              {promociones.map((_, i) => (
                <button key={i} className={`promo-ticker-dot ${i === tickerIdx ? 'active' : ''}`}
                  onClick={() => setTickerIdx(i)} />
              ))}
            </div>
          )}
        </div>
      )}

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

            <style>{`
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(18px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              .prod-card-rot {
                animation: fadeInUp 0.8s cubic-bezier(.4,0,.2,1) both;
              }
              .prod-card-rot:nth-child(2) { animation-delay: 0.1s; }
              .prod-card-rot:nth-child(3) { animation-delay: 0.18s; }
              .prod-card-rot:nth-child(4) { animation-delay: 0.26s; }
              .prod-card-rot img { transition: transform 0.5s ease; }
              .prod-card-rot:hover img { transform: scale(1.05); }
            `}</style>
            <div key={grupoProductos} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {productosGrupo.map(prod => (
                <div className="prod-card-rot" key={prod.id} style={{
                  background: 'var(--bg-card)', borderRadius: 14,
                  overflow: 'hidden', boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
                  border: '1px solid var(--rose-border)'
                }}>
                  <div style={{ height: 160, overflow: 'hidden' }}>
                    <img src={prod.imagen_principal || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80"}
                      alt={prod.nombre} loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <h5 style={{ margin: '0 0 4px', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{prod.nombre}</h5>
                    <p style={{ color: 'var(--rose)', fontSize: '1rem', fontWeight: 'bold', margin: '0 0 10px' }}>
                      ${Number(prod.precio_oferta || prod.precio_venta).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                    <Link to={`/producto/${prod.id}`} className="btn btn-secondary"
                      style={{ width: '100%', display: 'block', textAlign: 'center', fontSize: '0.8rem', padding: '6px 0' }}>
                      Ver Detalles
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {totalGrupos > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '1.5rem' }}>
                {Array.from({ length: totalGrupos }).map((_, i) => (
                  <button key={i} onClick={() => setGrupoProductos(i)}
                    style={{ width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: i === grupoProductos ? 'var(--rose)' : 'var(--rose-soft)', padding: 0 }} />
                ))}
              </div>
            )}

            <div className="text-center mt-5">
              <Link to="/catalogo-publico" className="btn btn-primary">Ver todo el catálogo</Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ COLECCIONES ═══════════ */}
      {colecciones.length > 0 && (
        <section className="news-section">
          <div className="container-lg">
            <div className="section-header text-center mb-5">
              <span className="section-label" style={{ margin: '0 auto' }}>Selecciones especiales</span>
              <h2 className="section-title">Nuestras <span>Colecciones</span></h2>
              <p className="section-subtitle">Piezas curadas para cada estilo y ocasión</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.2rem' }}>
              {colecciones.map((col: any) => (
                <Link key={col.id} to={`/catalogo-publico`}
                  style={{ textDecoration: 'none', borderRadius: 14, overflow: 'hidden', display: 'block',
                    border: '1px solid var(--rose-border)', background: 'var(--bg-card)',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.18)', transition: 'transform 0.25s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                  {col.imagen_url ? (
                    <img src={col.imagen_url} alt={col.nombre}
                      style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ height: 140, background: 'var(--bg-card-h)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '2.5rem' }}>🗂️</div>
                  )}
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>{col.nombre}</div>
                    {col.descripcion && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {col.descripcion}
                      </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--rose)' }}>
                      {col.productos.length} pieza{col.productos.length !== 1 ? 's' : ''} →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ PROMOCIONES ═══════════ */}
      {promociones.length > 0 && (
        <section className="features-section">
          <div className="container-lg">
            <div className="section-header text-center mb-5">
              <span className="section-label" style={{ margin: '0 auto' }}>Ofertas Especiales</span>
              <h2 className="section-title">Promociones <span>Activas</span></h2>
            </div>
            <div className="features-grid">
              {promociones.map(promo => (
                <div className="feature-card" key={promo.id}
                  style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--rose-border)' }}>
                  {(promo.tipo === 'porcentaje' || promo.tipo === 'monto_fijo' || promo.tipo === 'cupon') && (
                    <div style={{ position: 'absolute', top: '15px', right: '-35px', background: 'var(--rose-vivid)',
                      color: '#fff', padding: '0.3rem 3rem', transform: 'rotate(45deg)',
                      fontWeight: 'bold', fontSize: '0.85rem', zIndex: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                      {promo.tipo === 'monto_fijo' ? `-$${promo.valor_descuento}` : `-${promo.valor_descuento}%`}
                    </div>
                  )}
                  <div className="feature-icon">
                    <span style={{ fontSize: '1.8rem' }}>
                      {promo.tipo === 'envio_gratis' ? '🚚' : promo.tipo === '2x1' ? '2️⃣' : '🏷️'}
                    </span>
                  </div>
                  <h4 style={{ color: 'var(--rose-light)' }}>{promo.nombre}</h4>
                  <p style={{ fontSize: '0.88rem', opacity: 0.85 }}>{promoLabel(promo)}</p>
                  {promo.monto_minimo_compra && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--rose)', marginTop: 4 }}>
                      Compra mínima: ${promo.monto_minimo_compra}
                    </p>
                  )}
                  {promo.codigo_cupon && (
                    <div style={{ marginTop: 8, background: 'rgba(201,168,76,0.15)', borderRadius: 8,
                      padding: '4px 10px', display: 'inline-block', fontSize: '0.82rem',
                      fontWeight: 700, letterSpacing: 1, color: '#c9a84c' }}>
                      {promo.codigo_cupon}
                    </div>
                  )}
                  <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 8 }}>
                    Hasta {new Date(promo.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
                  </p>
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