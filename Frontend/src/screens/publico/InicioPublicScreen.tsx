import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { Link } from "react-router-dom";
import { contentAPI, carruselAPI, promocionesAPI, productsAPI, paginasAPI, seccionesAPI, contenidosAPI, coleccionesAPI } from "../../services/api";
import {
  AiOutlineTag, AiOutlineClose, AiOutlineLeft, AiOutlineRight, AiOutlineCar, AiOutlineGift,
  AiOutlineFolderOpen, AiOutlineStar, AiOutlineHeart, AiOutlinePhone, AiOutlineSafetyCertificate,
  AiOutlineBulb, AiOutlineSmile, AiOutlineTool,
} from "react-icons/ai";
import "./InicioPublicScreen.css";

const JDL_CLOUD = 'https://res.cloudinary.com/dltvkwwq4/image/upload';

const InicioPublicScreen: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // ── ESTADOS DE CARGA Y DATOS DINÁMICOS ──
  const [initialLoading, setInitialLoading] = useState(true);
  const [slides, setSlides] = useState<any[]>([]);
  const [promociones, setPromociones] = useState<any[]>([]);
  const [productosDestacados, setProductosDestacados] = useState<any[]>([]);
  const [noticiasHome, setNoticiasHome] = useState<any[]>([]);
  const [colecciones, setColecciones] = useState<any[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [tickerCerrado, setTickerCerrado] = useState(false);

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
          const paginas = await paginasAPI.getAll();
          const paginaInicio = Array.isArray(paginas)
            ? paginas.find((p: any) => p.slug === 'inicio')
            : paginas.data?.find((p: any) => p.slug === 'inicio');

          if (paginaInicio) {
            const secciones = await seccionesAPI.getByPagina(paginaInicio.id);
            const seccionesArray = Array.isArray(secciones) ? secciones : secciones.data || [];

            const seccionCarrusel = seccionesArray.find((s: any) =>
              s.nombre?.toLowerCase().includes('carrusel') ||
              s.nombre?.toLowerCase().includes('carousel')
            );

            if (seccionCarrusel) {
              const contenidos = await contenidosAPI.getBySeccion(seccionCarrusel.id);
              const contenidosArray = Array.isArray(contenidos) ? contenidos : contenidos.data || [];

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

              setSlides(slidesFromDB.length > 0 ? slidesFromDB : defaultSlides);
            } else {
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

          if (prods.length > 0) setProductosDestacados(prods);
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

  const productosDestacadosEd   = productosDestacados.slice(0, 3);
  const productosDestacadosGrid = productosDestacados.slice(3, 11);

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
            <div className="dl-loader-bars"><span /><span /><span /><span /></div>
            <p className="loading-text" style={{ marginTop: '1rem' }}>Cargando...</p>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="inicio-public-container">
      {/* ═══════════ BARRA TICKER PROMOCIONES ═══════════ */}
      {promociones.length > 0 && !tickerCerrado && (
        <div className="promo-ticker-fixed">
          <span className="promo-ticker-badge"><AiOutlineTag size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />OFERTA</span>
          <div className="promo-ticker-scroll-wrap">
            <div className="promo-ticker-scroll-track">
              {[...promociones, ...promociones].map((p, i) => (
                <span key={i} className="promo-ticker-scroll-item">
                  <strong>{p.nombre}</strong> — {promoLabel(p)}
                  {p.fecha_fin && (
                    <em> · Válida hasta {new Date(p.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</em>
                  )}
                  <span className="promo-ticker-sep">◆</span>
                </span>
              ))}
            </div>
          </div>
          <button className="promo-ticker-close" onClick={() => setTickerCerrado(true)} aria-label="Cerrar"><AiOutlineClose size={12} /></button>
        </div>
      )}
      {promociones.length > 0 && !tickerCerrado && <div className="promo-ticker-spacer" />}

      <PublicHeader />

      {/* ═══════════ HERO / CARRUSEL PRINCIPAL ═══════════ */}
      <section className="hero-carousel-section">
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
                  <h1 className="carousel-title">{slide.titulo || slide.title}</h1>
                  <p className="carousel-desc">{slide.descripcion || slide.description}</p>
                  <div className="carousel-actions">
                    <Link to={slide.enlace || "/catalogo-publico"} className="btn btn-primary">Explorar colección</Link>
                    <Link to="/catalogo-publico" className="btn btn-secondary">Ver catálogo completo</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="carousel-btn carousel-btn-prev" onClick={prevSlide} aria-label="Anterior"><AiOutlineLeft /></button>
          <button className="carousel-btn carousel-btn-next" onClick={nextSlide} aria-label="Siguiente"><AiOutlineRight /></button>

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

      {/* ═══════════ BARRA DE CONFIANZA ═══════════ */}
      <section className="trust-strip">
        <div className="container-lg trust-grid">
          <div className="trust-item">
            <AiOutlineHeart size={20} />
            <div>
              <strong>Hecho con amor</strong>
              <span>Piezas artesanales, una a una</span>
            </div>
          </div>
          <div className="trust-item">
            <AiOutlineSafetyCertificate size={20} />
            <div>
              <strong>Calidad garantizada</strong>
              <span>Materiales premium certificados</span>
            </div>
          </div>
          <div className="trust-item">
            <AiOutlineCar size={20} />
            <div>
              <strong>Envíos a todo Huejutla</strong>
              <span>Seguimiento en tiempo real</span>
            </div>
          </div>
          <div className="trust-item">
            <AiOutlinePhone size={20} />
            <div>
              <strong>Atención personalizada</strong>
              <span>Estamos aquí para ayudarte</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS BAND ═══════════ */}
      <div className="stats-band">
        {[
          { icon: AiOutlineBulb, n: "", l: "Muchos diseños exclusivos" },
          { icon: AiOutlineSmile, n: "", l: "Muchos clientes satisfechos" },
          { icon: AiOutlineTool, n: "100%", l: "Hecho a mano" },
          { icon: AiOutlineStar, n: "5 ★", l: "Calidad garantizada" },
        ].map((s, i, arr) => (
          <React.Fragment key={i}>
            <div className="stats-band-item">
              <s.icon size={20} className="stats-band-icon" />
              {s.n && <strong>{s.n}</strong>}
              <span>{s.l}</span>
            </div>
            {i < arr.length - 1 && <div className="stats-band-sep" />}
          </React.Fragment>
        ))}
      </div>

      {/* ═══════════ COLECCIONES ═══════════ */}
      {colecciones.length > 0 && (
        <section className="showcase-section">
          <div className="container-lg">
            <div className="section-header text-center mb-5">
              <div className="eyebrow-row eyebrow-row--center"><span className="eyebrow-line" /><span className="eyebrow-txt">Selecciones especiales</span><span className="eyebrow-line" /></div>
              <h2 className="section-title">Nuestras <span>Colecciones</span></h2>
              <p className="section-subtitle">Piezas curadas para cada estilo y ocasión</p>
            </div>
            <div className="showcase-grid">
              {colecciones.map((col: any) => (
                <Link key={col.id} to="/catalogo-publico" className="showcase-card">
                  <div className="showcase-card-img">
                    {col.imagen_url ? (
                      <img src={col.imagen_url} alt={col.nombre} loading="lazy" />
                    ) : (
                      <div className="showcase-card-fallback"><AiOutlineFolderOpen size={32} /></div>
                    )}
                  </div>
                  <div className="showcase-card-body">
                    <h3>{col.nombre}</h3>
                    {col.descripcion && <p>{col.descripcion}</p>}
                    <span className="showcase-card-count">
                      {col.productos.length} pieza{col.productos.length !== 1 ? 's' : ''} →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ PIEZAS DESTACADAS (editorial) ═══════════ */}
      {productosDestacadosEd.length > 0 && (
        <section className="showcase-section showcase-section--alt">
          <div className="container-lg">
            <div className="section-header mb-5">
              <div className="eyebrow-row"><span className="eyebrow-line" /><span className="eyebrow-txt">Piezas destacadas</span></div>
              <h2 className="section-title">Lo que más <span>enamora</span></h2>
            </div>

            <div className="editorial-grid">
              {productosDestacadosEd.map(prod => {
                const precioFinal = prod.precio_promocion ?? prod.precio_oferta;
                const conDesc = precioFinal && precioFinal < prod.precio_venta;
                return (
                  <Link to={`/producto/${prod.id}`} className="editorial-card" key={prod.id}>
                    <div className="editorial-card-img">
                      <img
                        src={prod.imagen_principal || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80"}
                        alt={prod.nombre}
                        loading="lazy"
                      />
                      {prod.es_nuevo && <span className="prod-badge prod-badge--nuevo">Nuevo</span>}
                      {conDesc && <span className="prod-badge prod-badge--oferta">Oferta</span>}
                    </div>
                    <div className="editorial-card-body">
                      {prod.categoria_nombre && <span className="prod-categoria">{prod.categoria_nombre}</span>}
                      <h3>{prod.nombre}</h3>
                      <div className="product-card-precio">
                        {conDesc && (
                          <span className="precio-tachado">${Number(prod.precio_venta).toLocaleString('es-MX')}</span>
                        )}
                        <span className="precio-final">${Number(precioFinal ?? prod.precio_venta).toLocaleString('es-MX')}</span>
                      </div>
                      <span className="product-card-link">Ver pieza →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ SELECCIÓN (bento) ═══════════ */}
      {productosDestacadosGrid.length > 0 && (
        <section className="showcase-section">
          <div className="container-lg">
            <div className="section-header-row mb-5">
              <div className="eyebrow-row"><span className="eyebrow-line" /><span className="eyebrow-txt">Selección</span></div>
              <Link to="/catalogo-publico" className="ver-todos-link">Ver todos →</Link>
            </div>
            <h2 className="section-title" style={{ marginTop: '-1rem', marginBottom: '2rem' }}>Productos <span>Recientes</span></h2>

            <div className="product-grid">
              {productosDestacadosGrid.map(prod => {
                const precioFinal = prod.precio_promocion ?? prod.precio_oferta;
                const conDesc = precioFinal && precioFinal < prod.precio_venta;
                return (
                  <Link to={`/producto/${prod.id}`} className="product-card" key={prod.id}>
                    <div className="product-card-img">
                      <img
                        src={prod.imagen_principal || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80"}
                        alt={prod.nombre}
                        loading="lazy"
                      />
                      {prod.es_nuevo && <span className="prod-badge prod-badge--nuevo">Nuevo</span>}
                      {conDesc && <span className="prod-badge prod-badge--oferta">Oferta</span>}
                      {prod.stock_actual === 0 && <span className="prod-badge prod-badge--agotado">Agotado</span>}
                      <div className="product-card-overlay"><span>Ver pieza →</span></div>
                    </div>
                    <div className="product-card-body">
                      {prod.categoria_nombre && <span className="prod-categoria">{prod.categoria_nombre}</span>}
                      <h5>{prod.nombre}</h5>
                      <div className="product-card-precio">
                        {conDesc && (
                          <span className="precio-tachado">${Number(prod.precio_venta).toLocaleString('es-MX')}</span>
                        )}
                        <span className="precio-final">${Number(precioFinal ?? prod.precio_venta).toLocaleString('es-MX')}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="text-center mt-5">
              <Link to="/catalogo-publico" className="btn btn-primary">Ver todo el catálogo</Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ PROMOCIONES ═══════════ */}
      {promociones.length > 0 && (
        <section className="features-section">
          <div className="container-lg">
            <div className="section-header text-center mb-5">
              <div className="eyebrow-row eyebrow-row--center"><span className="eyebrow-line" /><span className="eyebrow-txt">Ofertas especiales</span><span className="eyebrow-line" /></div>
              <h2 className="section-title">Promociones <span>Activas</span></h2>
            </div>
            <div className="features-grid">
              {promociones.map(promo => (
                <div className="feature-card promo-card" key={promo.id}>
                  {(promo.tipo === 'porcentaje' || promo.tipo === 'monto_fijo' || promo.tipo === 'cupon') && (
                    <div className="promo-ribbon">
                      {promo.tipo === 'monto_fijo' ? `-$${promo.valor_descuento}` : `-${promo.valor_descuento}%`}
                    </div>
                  )}
                  <div className="feature-icon">
                    {promo.tipo === 'envio_gratis' ? <AiOutlineCar size={22} /> : promo.tipo === '2x1' ? <AiOutlineGift size={22} /> : <AiOutlineTag size={22} />}
                  </div>
                  <h4>{promo.nombre}</h4>
                  <p>{promoLabel(promo)}</p>
                  {promo.monto_minimo_compra && (
                    <p className="promo-minimo">Compra mínima: ${promo.monto_minimo_compra}</p>
                  )}
                  {promo.codigo_cupon && (
                    <div className="promo-codigo">{promo.codigo_cupon}</div>
                  )}
                  <p className="promo-vigencia">
                    Hasta {new Date(promo.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ POR QUÉ ELEGIRNOS ═══════════ */}
      <section className="features-section" style={{ borderTop: '1px solid var(--rose-soft)' }}>
        <div className="container-lg">
          <div className="section-header text-center mb-5">
            <div className="eyebrow-row eyebrow-row--center"><span className="eyebrow-line" /><span className="eyebrow-txt">Por qué elegirnos</span><span className="eyebrow-line" /></div>
            <h2 className="section-title">Lo que nos hace <span>especiales</span></h2>
            <p className="section-subtitle">Cada detalle importa, cada pieza cuenta una historia</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><AiOutlineStar size={22} /></div>
              <h4>Diseño Premium</h4>
              <p>Cada pieza es cuidadosamente diseñada con materiales de alta calidad y atención al detalle.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><AiOutlineHeart size={22} /></div>
              <h4>Hecho con Amor</h4>
              <p>Creado con pasión artesanal y dedicación en cada proceso de fabricación.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><AiOutlinePhone size={22} /></div>
              <h4>Soporte 24/7</h4>
              <p>Nuestro equipo está disponible para ayudarte en cualquier momento que lo necesites.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><AiOutlineCar size={22} /></div>
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
            <div className="eyebrow-row eyebrow-row--center"><span className="eyebrow-line" /><span className="eyebrow-txt">Últimas novedades</span><span className="eyebrow-line" /></div>
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
