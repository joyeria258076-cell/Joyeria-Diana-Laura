import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import Seccion from "../../components/Seccion";
import { Link, useNavigate } from "react-router-dom";
import { contentAPI, carruselAPI, promocionesAPI, productsAPI, coleccionesAPI } from "../../services/api";
import {
  AiOutlineTag, AiOutlineClose, AiOutlineLeft, AiOutlineRight, AiOutlineCar, AiOutlineGift,
  AiOutlineFolderOpen, AiOutlineStar, AiOutlineHeart, AiOutlinePhone, AiOutlineSafetyCertificate,
  AiOutlineSearch, AiOutlineArrowRight, AiOutlineEnvironment, AiOutlineEdit,
} from "react-icons/ai";
import "./InicioPublicScreen.css";
import "./InicioPublicApp.css";
import "./InicioPortada.css";

const JDL_CLOUD = 'https://res.cloudinary.com/dltvkwwq4/image/upload';

// Las fotos de producto se suben tal cual (a veces en resolución muy alta)
// y aquí se muestran en tarjetas pequeñas. Si la URL es de Cloudinary, le
// insertamos una transformación al vuelo (formato/calidad automáticos +
// ancho acotado) para no bajar la imagen completa innecesariamente.
const optimizarImagen = (url: string | undefined, ancho: number): string | undefined => {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  if (/\/upload\/[^/]*w_\d/.test(url)) return url; // ya trae una transformación de ancho
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${ancho}/`);
};

// El hero del carrusel se pinta a ancho completo (100vw) tanto en celular
// como en pantallas grandes, pero antes siempre se pedía la misma imagen de
// 1400px de ancho sin importar el dispositivo — en un celular (~412px CSS,
// el que usa Lighthouse) eso son cientos de KB de más que ni se alcanzan a
// ver. Con srcset + sizes="100vw", el navegador elige el ancho real que
// necesita según su pantalla, en vez de bajar siempre la versión grande.
const ANCHOS_HERO = [480, 768, 1080, 1400, 1920];

const construirSrcSetHero = (urlBase: string | undefined): string | undefined => {
  if (!urlBase) return undefined;
  if (urlBase.includes('res.cloudinary.com') && urlBase.includes('/upload/')) {
    return ANCHOS_HERO
      .map(a => `${urlBase.replace('/upload/', `/upload/f_auto,q_auto,w_${a}/`)} ${a}w`)
      .join(', ');
  }
  if (urlBase.includes('images.unsplash.com')) {
    const base = urlBase.split('?')[0];
    return ANCHOS_HERO.map(a => `${base}?w=${a}&q=80&fit=crop&auto=format ${a}w`).join(', ');
  }
  return undefined;
};

// ── DATOS DE RESPALDO (Fallbacks) — a nivel de módulo para poder usarlos
// como valor inicial del estado (contenido visible desde el primer render,
// sin esperar la cadena de llamadas paginas→secciones→contenidos que antes
// dejaba el hero en blanco varios segundos y disparaba el LCP). ──
const defaultSlides = [
  {
    id: 's1',
    tag: "Nueva Colección",
    titulo: "Colección De Oro",
    descripcion: "Piezas únicas forjadas en oro de 18 quilates para quienes buscan el brillo eterno.",
    imagen: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1080&q=80&fit=crop",
    imagenBase: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338",
  },
  {
    id: 's2',
    tag: "Tendencia 2026",
    titulo: "Colección De Plata",
    descripcion: "Elegancia contemporánea en plata esterlina con acabados artesanales.",
    imagen: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1080&q=80&fit=crop",
    imagenBase: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a",
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

const InicioPublicScreen: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [busqueda, setBusqueda] = useState("");

  // ── ESTADOS DE CARGA Y DATOS DINÁMICOS ──
  // (sin gate de "pantalla completa de carga": cada sección se pinta con
  // su valor por defecto/vacío y se actualiza sola en cuanto su propia
  // llamada resuelve, en vez de bloquear toda la página hasta que las 5
  // llamadas terminen — eso además causaba que <PublicFooter/> se montara
  // dos veces, disparando su fetch de zonas de entrega por duplicado.)
  const [slides, setSlides] = useState<any[]>(defaultSlides);
  const [promociones, setPromociones] = useState<any[]>([]);
  const [productosDestacados, setProductosDestacados] = useState<any[]>([]);
  const [noticiasHome, setNoticiasHome] = useState<any[]>([]);
  const [colecciones, setColecciones] = useState<any[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [tickerCerrado, setTickerCerrado] = useState(false);

  // ── OBTENER DATOS DEL BACKEND ──
  // Las 5 llamadas son independientes entre sí, así que se disparan todas
  // en paralelo (antes eran 5 `await` en cadena, uno detrás del otro: el
  // tiempo total era la SUMA de las 5, no el máximo). Cada una actualiza
  // su propio estado apenas resuelve, sin esperar a las demás — el hero
  // (con su contenido de respaldo) y el resto de la página ya no esperan
  // a que termine la más lenta para poder pintarse.
  useEffect(() => {
    // 1. CARRUSEL — antes eran 3 llamadas encadenadas (paginas -> secciones
    // -> contenidos); ahora es 1 sola a un endpoint que resuelve el JOIN
    // del lado del servidor.
    (async () => {
      try {
        const contenidos = await contentAPI.getCarruselInicio();
        const contenidosArray = Array.isArray(contenidos) ? contenidos : contenidos.data || [];

        const slidesFromDB = contenidosArray
          .filter((c: any) => c.activo !== false)
          .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
          .map((c: any) => ({
            id: c.id.toString(),
            titulo: c.titulo,
            tag: c.etiqueta || "Exclusivo",
            descripcion: c.descripcion || "Descubre nuestras colecciones exclusivas",
            imagen: optimizarImagen(c.imagen_url, 1080),
            image: optimizarImagen(c.imagen_url, 1080),
            imagenBase: c.imagen_url,
            enlace: c.enlace_url,
            enlace_nueva_ventana: c.enlace_nueva_ventana
          }));

        setSlides(slidesFromDB.length > 0 ? slidesFromDB : defaultSlides);
      } catch (e) {
        console.error("Error obteniendo carrusel de BD:", e);
        setSlides(defaultSlides);
      }
    })();

    // 2. Promociones activas
    (async () => {
      try {
        const promoRes = await promocionesAPI.getActivas();
        const lista = Array.isArray(promoRes) ? promoRes : (promoRes.data || []);
        setPromociones(lista);
      } catch (e) { console.log("Sin promociones"); }
    })();

    // 3. Productos Destacados (Últimos 4)
    (async () => {
      try {
        const prodRes = await productsAPI.getAll();
        let prods = [];
        if (Array.isArray(prodRes)) prods = prodRes;
        else if (prodRes && Array.isArray(prodRes.data)) prods = prodRes.data;

        if (prods.length > 0) setProductosDestacados(prods);
      } catch (e) { console.log("Error cargando productos"); }
    })();

    // 4. Colecciones
    (async () => {
      try {
        const resCol = await coleccionesAPI.getPublicas();
        const cols = Array.isArray(resCol) ? resCol : (resCol.data || []);
        setColecciones(cols.filter((c: any) => c.productos?.length > 0));
      } catch { /* sin colecciones */ }
    })();

    // 5. Noticias
    (async () => {
      try {
        const noticiasRes = await contentAPI.getNoticias();
        if (noticiasRes && noticiasRes.length > 0) {
          const activas = noticiasRes.filter((n: any) => n.activa);
          setNoticiasHome(activas.slice(0, 3));
        } else {
          setNoticiasHome(defaultNews);
        }
      } catch (e) { setNoticiasHome(defaultNews); }
    })();
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

  // Solo piezas reales disponibles y con foto para lo que se muestra en portada
  const visibles = productosDestacados.filter((p: any) => p.imagen_principal && p.stock_actual > 0 && !String(p.nombre).startsWith('[DEMO]'));
  const baseVitrina = visibles.length >= 6 ? visibles : productosDestacados;
  const piezaFlotante: any = visibles[0] || null;
  // Categorías con la foto de una de sus piezas y cuántas hay
  const categoriasFoto = Object.values(productosDestacados.reduce((acc: Record<string, any>, p: any) => {
    if (!p.categoria_id || !p.categoria_nombre) return acc;
    const c = acc[p.categoria_id] || (acc[p.categoria_id] = { id: p.categoria_id, nombre: p.categoria_nombre, cuantos: 0, imagen: null });
    c.cuantos += 1;
    if (!c.imagen && p.imagen_principal && p.stock_actual > 0) c.imagen = p.imagen_principal;
    return acc;
  }, {})).map((c: any) => ({ ...c, imagen: c.imagen || productosDestacados.find((p: any) => p.categoria_id === c.id && p.imagen_principal)?.imagen_principal }))
    .filter((c: any) => c.imagen) as { id: number; nombre: string; cuantos: number; imagen: string }[];

  const productosDestacadosEd   = baseVitrina.slice(0, 3);
  const productosDestacadosGrid = baseVitrina.slice(3, 11);

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

  return (
    <div className="inicio-public-container">
      {/* ═══════════ BARRA TICKER PROMOCIONES ═══════════ */}
      <Seccion id="inicio.ticker" nombre="Barra de ofertas">
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
      </Seccion>

      <PublicHeader />

      <main className="dl-orden">
      <Seccion id="inicio.carrusel" nombre="Carrusel principal">
      <section className="ph-hero">
        {/* Texto y buscador */}
        <div className="ph-hero-texto">
          <span className="ph-eyebrow"><AiOutlineEnvironment size={13} /> Joyería Diana Laura · Huejutla</span>
          <h1 className="ph-titulo">Tu brillo,<br /><em>en tu bolsillo.</em></h1>
          <p className="ph-sub">Joyería y bisutería con esencia femenina. Piezas únicas, personalizables y listas para regalar.</p>
          <form className="ph-buscador" role="search" onSubmit={e => { e.preventDefault(); navigate(`/catalogo-publico${busqueda.trim() ? `?q=${encodeURIComponent(busqueda.trim())}` : ''}`); }}>
            <AiOutlineSearch size={20} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Busca anillos, cadenas, aretes…" aria-label="Buscar joyas" />
            <button type="submit">Buscar</button>
          </form>
          <div className="ph-acciones">
            <Link to="/catalogo-publico" className="ph-btn">Ver catálogo <AiOutlineArrowRight size={16} /></Link>
            <Link to="/registro" className="ph-btn ph-btn--borde">Crear mi cuenta</Link>
          </div>
          <ul className="ph-puntos">
            <li><AiOutlineHeart size={15} /> Hecho con amor</li>
            <li><AiOutlineEdit size={15} /> Personalizable</li>
            <li><AiOutlineCar size={15} /> Envíos en Huejutla y alrededores</li>
          </ul>
        </div>

        {/* Imagen del carrusel en tarjeta alta */}
        <div className="ph-visual">
          <div className="ph-foto">
            {slides.map((slide, index) => {
              const siguiente = (currentSlide + 1) % slides.length;
              const debeCargar = index === currentSlide || index === siguiente;
              return (
                <div key={slide.id} className={`ph-slide${index === currentSlide ? ' activa' : ''}`}>
                  {debeCargar && (
                    <img src={slide.imagen || slide.image} srcSet={construirSrcSetHero(slide.imagenBase || slide.imagen || slide.image)}
                      sizes="(max-width: 900px) 100vw, 50vw" alt="" fetchPriority={index === 0 ? 'high' : 'low'} loading={index === 0 ? 'eager' : 'lazy'} />
                  )}
                </div>
              );
            })}
            <div className="ph-foto-velo" />
            <Link to={slides[currentSlide]?.enlace || '/catalogo-publico'} className="ph-slide-info">
              <span>{slides[currentSlide]?.tag || 'Exclusivo'}</span>
              <strong>{slides[currentSlide]?.titulo || slides[currentSlide]?.title}</strong>
              <small>{slides[currentSlide]?.descripcion || slides[currentSlide]?.description}</small>
            </Link>
            {slides.length > 1 && (
              <div className="ph-controles">
                <button onClick={prevSlide} aria-label="Anterior"><AiOutlineLeft /></button>
                <div className="ph-dots">
                  {slides.map((s, i) => <button key={s.id} className={i === currentSlide ? 'activo' : ''} onClick={() => setCurrentSlide(i)} aria-label={`Diapositiva ${i + 1}`} />)}
                </div>
                <button onClick={nextSlide} aria-label="Siguiente"><AiOutlineRight /></button>
              </div>
            )}
          </div>
          {piezaFlotante && (
            <Link to={`/producto-publico/${piezaFlotante.id}`} className="ph-flotante">
              <img src={optimizarImagen(piezaFlotante.imagen_principal, 200)} alt="" />
              <span>
                <small>Nuevo en tienda</small>
                <strong>{piezaFlotante.nombre}</strong>
                <b>${Number(piezaFlotante.precio_oferta ?? piezaFlotante.precio_venta).toLocaleString('es-MX')}</b>
              </span>
            </Link>
          )}
        </div>
      </section>
      </Seccion>

      {/* ═══════════ CATEGORÍAS CON FOTO ═══════════ */}
      <Seccion id="inicio.categorias" nombre="Categorías">
      {categoriasFoto.length > 0 && (
        <section className="ph-cats">
          <div className="ph-seccion-cabeza">
            <div><span className="ph-eyebrow">Explora</span><h2 className="ph-h2">¿Qué estás <em>buscando</em>?</h2></div>
            <Link to="/catalogo-publico" className="ph-ver">Ver todo <AiOutlineArrowRight size={14} /></Link>
          </div>
          <div className="ph-cats-fila">
            {categoriasFoto.map(c => (
              <Link key={c.id} to={`/catalogo-publico?categoria=${c.id}`} className="ph-cat">
                <span className="ph-cat-foto"><img src={optimizarImagen(c.imagen, 300)} alt="" loading="lazy" /></span>
                <strong>{c.nombre}</strong>
                <small>{c.cuantos} pieza{c.cuantos === 1 ? '' : 's'}</small>
              </Link>
            ))}
          </div>
        </section>
      )}
      </Seccion>

      {/* ═══════════ COLECCIONES ═══════════ */}
      <Seccion id="inicio.colecciones" nombre="Colecciones">
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
                      <img src={optimizarImagen(col.imagen_url, 500)} alt={col.nombre} loading="lazy" />
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
      </Seccion>

      {/* ═══════════ PIEZAS DESTACADAS (editorial) ═══════════ */}
      <Seccion id="inicio.destacadas" nombre="Piezas destacadas">
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
                  <Link to={`/producto-publico/${prod.id}`} className="editorial-card" key={prod.id}>
                    <div className="editorial-card-img">
                      <img
                        src={optimizarImagen(prod.imagen_principal, 500) || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80"}
                        alt={prod.nombre}
                        loading="lazy"
                      />
                      {prod.es_nuevo && <span className="prod-badge prod-badge--nuevo">Nuevo</span>}
                      {(prod as any).permite_personalizacion && <span className="prod-badge prod-badge--nuevo">Personalizable</span>}
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
      </Seccion>

      {/* ═══════════ SELECCIÓN (bento) ═══════════ */}
      <Seccion id="inicio.seleccion" nombre="Productos recientes">
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
                  <Link to={`/producto-publico/${prod.id}`} className="product-card" key={prod.id}>
                    <div className="product-card-img">
                      <img
                        src={optimizarImagen(prod.imagen_principal, 500) || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80"}
                        alt={prod.nombre}
                        loading="lazy"
                      />
                      {prod.es_nuevo && <span className="prod-badge prod-badge--nuevo">Nuevo</span>}
                      {(prod as any).permite_personalizacion && <span className="prod-badge prod-badge--nuevo">Personalizable</span>}
                      {conDesc && <span className="prod-badge prod-badge--oferta">Oferta</span>}
                      {prod.stock_actual === 0 && <span className="prod-badge prod-badge--agotado">Agotado</span>}
                      <div className="product-card-overlay"><span>Ver pieza →</span></div>
                    </div>
                    <div className="product-card-body">
                      {prod.categoria_nombre && <span className="prod-categoria">{prod.categoria_nombre}</span>}
                      <h3>{prod.nombre}</h3>
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
      </Seccion>

      {/* ═══════════ PROMOCIONES ═══════════ */}
      <Seccion id="inicio.promociones" nombre="Promociones activas">
      {promociones.length > 0 && (
        <section className="ph-promos">
          <div className="ph-seccion-cabeza">
            <div><span className="ph-eyebrow">Ofertas</span><h2 className="ph-h2">Promociones <em>activas</em></h2></div>
          </div>
          <div className="ph-promos-fila">
            {promociones.map((promo, i) => (
              <Link key={promo.id} to="/catalogo-publico" className={`ph-promo ph-promo--${i % 3}`}>
                <span className="ph-promo-tag"><AiOutlineTag size={12} /> {promo.fecha_fin ? `Hasta el ${new Date(promo.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}` : 'Por tiempo limitado'}</span>
                <strong className="ph-promo-valor">
                  {promo.tipo === 'monto_fijo' ? `-$${promo.valor_descuento}` : promo.tipo === 'envio_gratis' ? 'Envío gratis' : promo.tipo === '2x1' ? '2×1' : `-${promo.valor_descuento}%`}
                </strong>
                <span className="ph-promo-nombre">{promo.nombre}</span>
                {promo.codigo_cupon && <span className="ph-promo-cupon">Código: <b>{promo.codigo_cupon}</b></span>}
                {promo.monto_minimo_compra && <small>Compra mínima ${promo.monto_minimo_compra}</small>}
                <span className="ph-promo-ir">Ver piezas <AiOutlineArrowRight size={14} /></span>
              </Link>
            ))}
          </div>
        </section>
      )}
      </Seccion>

      {/* ═══════════ POR QUÉ ELEGIRNOS ═══════════ */}
      <Seccion id="inicio.porque" nombre="Por qué elegirnos">
      <section className="features-section">
        <div className="container-lg">
          <div className="section-header text-center mb-5">
            <div className="eyebrow-row eyebrow-row--center"><span className="eyebrow-line" /><span className="eyebrow-txt">Por qué elegirnos</span><span className="eyebrow-line" /></div>
            <h2 className="section-title">Lo que nos hace <span>especiales</span></h2>
            <p className="section-subtitle">Cada detalle importa, cada pieza cuenta una historia</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><AiOutlineStar size={22} /></div>
              <h3>Diseño Premium</h3>
              <p>Cada pieza es cuidadosamente diseñada con materiales de alta calidad y atención al detalle.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><AiOutlineHeart size={22} /></div>
              <h3>Hecho con Amor</h3>
              <p>Creado con pasión artesanal y dedicación en cada proceso de fabricación.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><AiOutlinePhone size={22} /></div>
              <h3>Soporte 24/7</h3>
              <p>Nuestro equipo está disponible para ayudarte en cualquier momento que lo necesites.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><AiOutlineCar size={22} /></div>
              <h3>Envío Rápido</h3>
              <p>Entrega segura y rápida a cualquier lugar, con seguimiento en tiempo real.</p>
            </div>
          </div>
        </div>
      </section>
      </Seccion>

      {/* ═══════════ NOTICIAS DINÁMICAS ═══════════ */}
      <Seccion id="inicio.noticias" nombre="Noticias y novedades">
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
                    src={optimizarImagen(noticia.imagen, 500) || "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80"}
                    alt={noticia.titulo}
                    loading="lazy"
                  />
                </div>
                <div className="news-content">
                  <h3 className="news-title">{noticia.titulo}</h3>
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
      </Seccion>

      {/* ═══════════ CTA ═══════════ */}
      <Seccion id="inicio.cta" nombre="Invitación al catálogo">
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
      </Seccion>
      </main>

      <PublicFooter />
    </div>
  );
};

export default InicioPublicScreen;
