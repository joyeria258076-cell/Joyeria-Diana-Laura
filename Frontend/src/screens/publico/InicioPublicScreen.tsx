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
import "./InicioJoyero.css";
import "./InicioSecciones.css";

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
  // Arranca con el último carrusel guardado (visitas repetidas) o vacío:
  // antes se pintaba primero el respaldo y luego se reemplazaba por el de la
  // BD, y ese cambio de imagen era lo que retrasaba el LCP en celular.
  const [slides, setSlides] = useState<any[]>(() => {
    try { const c = JSON.parse(localStorage.getItem('dl_carrusel') || 'null'); return Array.isArray(c) && c.length ? c : []; }
    catch { return []; }
  });
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
        // Si el respaldo tarda (servidor dormido), mostrar el de respaldo
        const respaldo = setTimeout(() => setSlides(s => (s.length ? s : defaultSlides)), 3000);
        // index.html ya pidió el carrusel en paralelo a la descarga del JS
        const temprano = (window as any).__carruselInicio;
        (window as any).__carruselInicio = null;
        const contenidos = (temprano && await temprano) || await contentAPI.getCarruselInicio();
        clearTimeout(respaldo);
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
        try { localStorage.setItem('dl_carrusel', JSON.stringify(slidesFromDB)); } catch { /* sin storage */ }
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


  // Solo piezas reales disponibles y con foto para lo que se muestra en portada
  const visibles = productosDestacados.filter((p: any) => p.imagen_principal && p.stock_actual > 0 && !String(p.nombre).startsWith('[DEMO]'));
  const baseVitrina = visibles.length >= 6 ? visibles : productosDestacados;
  // Categorías con la foto de una de sus piezas y cuántas hay
  const categoriasFoto = Object.values(productosDestacados.reduce((acc: Record<string, any>, p: any) => {
    if (!p.categoria_id || !p.categoria_nombre) return acc;
    const c = acc[p.categoria_id] || (acc[p.categoria_id] = { id: p.categoria_id, nombre: p.categoria_nombre, cuantos: 0, imagen: null });
    c.cuantos += 1;
    if (!c.imagen && p.imagen_principal && p.stock_actual > 0) c.imagen = p.imagen_principal;
    return acc;
  }, {})).map((c: any) => ({ ...c, imagen: c.imagen || productosDestacados.find((p: any) => p.categoria_id === c.id && p.imagen_principal)?.imagen_principal }))
    .filter((c: any) => c.imagen) as { id: number; nombre: string; cuantos: number; imagen: string }[];

  const colgantes = baseVitrina.slice(0, 5);
  const productosDestacadosGrid = baseVitrina.slice(5, 14);

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
        <div className="promo-ticker-fixed promo-ticker-fixed--abajo">
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
      </Seccion>

      <PublicHeader />

      <main className="dl-orden">
      <Seccion id="inicio.carrusel" nombre="Carrusel principal">
      <section className="jy" aria-label="Joyería Diana Laura">
        <div className="jy-cabeza">
          <h1 className="jy-lema">Tu brillo,<br /><em>en tu bolsillo.</em></h1>
          <div className="jy-cabeza-lado">
            <p>Joyería y bisutería con esencia femenina, hecha en Huejutla. Personalízala, apártala en abonos o recógela en tienda.</p>
            <form className="jy-buscar" role="search" onSubmit={e => { e.preventDefault(); navigate(`/catalogo-publico${busqueda.trim() ? `?q=${encodeURIComponent(busqueda.trim())}` : ''}`); }}>
              <AiOutlineSearch size={19} aria-hidden="true" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Busca un anillo, una cadena, un nombre…" aria-label="Buscar joyas" />
              <button type="submit">Buscar</button>
            </form>
          </div>
        </div>

        <div className="jy-caja">
          {/* Compartimento grande: lo que la tienda está presumiendo (carrusel administrable) */}
          <Link to={slides[currentSlide]?.enlace || '/catalogo-publico'} className="jy-hueco jy-hueco--estrella">
            {slides.map((slide, index) => {
              const siguiente = (currentSlide + 1) % slides.length;
              if (index !== currentSlide && index !== siguiente) return null;
              return (
                <img key={slide.id} className={index === currentSlide ? 'activa' : ''} src={slide.imagen || slide.image}
                  srcSet={construirSrcSetHero(slide.imagenBase || slide.imagen || slide.image)} sizes="(max-width: 900px) 100vw, 50vw"
                  alt="" fetchPriority={index === 0 ? 'high' : 'low'} loading={index === 0 ? 'eager' : 'lazy'} />
              );
            })}
            <span className="jy-hueco-texto">
              <strong>{slides[currentSlide]?.titulo || 'Lo nuevo'}</strong>
              <small>{slides[currentSlide]?.descripcion}</small>
            </span>
            {slides.length > 1 && (
              <span className="jy-pasos" aria-hidden="true">
                {slides.map((s, i) => <i key={s.id} className={i === currentSlide ? 'activo' : ''} />)}
              </span>
            )}
          </Link>

          {categoriasFoto.slice(0, 4).map(c => (
            <Link key={c.id} to={`/catalogo-publico?categoria=${c.id}`} className="jy-hueco">
              <img src={optimizarImagen(c.imagen, 600)} srcSet={`${optimizarImagen(c.imagen, 300)} 300w, ${optimizarImagen(c.imagen, 600)} 600w`} sizes="(max-width: 900px) 50vw, 25vw" alt="" loading="lazy" />
              <span className="jy-hueco-texto">
                <strong>{c.nombre}</strong>
                <small>{c.cuantos} pieza{c.cuantos === 1 ? '' : 's'}</small>
              </span>
            </Link>
          ))}
        </div>

        <nav className="jy-mas" aria-label="Más categorías">
          {categoriasFoto.slice(4).map(c => (
            <Link key={c.id} to={`/catalogo-publico?categoria=${c.id}`}>{c.nombre} <small>{c.cuantos}</small></Link>
          ))}
          <Link to="/catalogo-publico" className="jy-mas-todo">Ver todo el catálogo <AiOutlineArrowRight size={15} /></Link>
        </nav>
      </section>
      </Seccion>

      <Seccion id="inicio.categorias" nombre="Categorías">
        {null}
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

      {/* ═══════════ PIEZAS DESTACADAS: etiquetas colgantes ═══════════ */}
      <Seccion id="inicio.destacadas" nombre="Piezas destacadas">
      {colgantes.length > 0 && (
        <section className="et">
          <div className="et-cabeza">
            <h2>Lo que más <em>enamora</em></h2>
            <p>Cada etiqueta dice cómo llevártela: de contado, en abonos o con tu nombre grabado.</p>
          </div>
          <ul className="et-hilo">
            {colgantes.map((prod: any, i: number) => {
              const precioFinal = Number(prod.precio_promocion ?? prod.precio_oferta ?? prod.precio_venta);
              const conDesc = precioFinal < Number(prod.precio_venta);
              return (
                <li key={prod.id} className="et-pieza" style={{ ['--caida' as any]: `${[0, 56, 18, 74, 30][i % 5]}px`, ['--retraso' as any]: `${i * 90}ms` }}>
                  <Link to={`/producto-publico/${prod.id}`} className="et-colgante">
                    <span className="et-foto"><img src={optimizarImagen(prod.imagen_principal, 420)} alt={prod.nombre} loading="lazy" /></span>
                    <span className="et-etiqueta">
                      <span className="et-nombre">{prod.nombre}</span>
                      <span className="et-precio">
                        {conDesc && <s>${Number(prod.precio_venta).toLocaleString('es-MX')}</s>}
                        ${precioFinal.toLocaleString('es-MX')}
                      </span>
                      <span className="et-forma">{prod.permite_personalizacion ? 'Personalizable' : precioFinal >= 300 ? 'Apártala en abonos' : 'Lista para regalar'}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      </Seccion>

      {/* ═══════════ SELECCIÓN (bento) ═══════════ */}
      <Seccion id="inicio.seleccion" nombre="Productos recientes">
      {productosDestacadosGrid.length > 0 && (
        <section className="rl">
          <div className="rl-cabeza">
            <h2>Recién <em>llegadas</em></h2>
            <Link to="/catalogo-publico" className="rl-ver">Ver las {productosDestacados.length} piezas <AiOutlineArrowRight size={15} /></Link>
          </div>
          <div className="rl-mosaico">
            {productosDestacadosGrid.map((prod, i) => {
              const precioFinal = Number(prod.precio_promocion ?? prod.precio_oferta ?? prod.precio_venta);
              const conDesc = precioFinal < Number(prod.precio_venta);
              return (
                <Link to={`/producto-publico/${prod.id}`} className={`rl-pieza${i === 0 ? ' rl-pieza--grande' : ''}`} key={prod.id}>
                  <span className="rl-foto">
                    <img src={optimizarImagen(prod.imagen_principal, i === 0 ? 900 : 500)} srcSet={i === 0 ? `${optimizarImagen(prod.imagen_principal, 450)} 450w, ${optimizarImagen(prod.imagen_principal, 900)} 900w` : `${optimizarImagen(prod.imagen_principal, 300)} 300w, ${optimizarImagen(prod.imagen_principal, 500)} 500w`} sizes={i === 0 ? "(max-width: 900px) 100vw, 40vw" : "(max-width: 900px) 50vw, 20vw"} alt={prod.nombre} loading="lazy" />
                    {prod.permite_personalizacion && <span className="rl-sello">Personalizable</span>}
                    {conDesc && <span className="rl-sello rl-sello--oferta">Oferta</span>}
                  </span>
                  <span className="rl-datos">
                    <small>{prod.categoria_nombre}</small>
                    <strong>{prod.nombre}</strong>
                    <b>{conDesc && <s>${Number(prod.precio_venta).toLocaleString('es-MX')}</s>}${precioFinal.toLocaleString('es-MX')}</b>
                  </span>
                </Link>
              );
            })}
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

      {/* ═══════════ CÓMO TE LA LLEVAS ═══════════ */}
      <Seccion id="inicio.porque" nombre="Por qué elegirnos">
      <section className="pm">
        <div className="pm-banda">
          <h2>Cuatro formas de <em>llevártela</em></h2>
          <ol className="pm-lista">
            <li><AiOutlineEdit size={22} /><strong>Con tu nombre</strong><span>Elige talla, largo, metal o grabado al comprar; la hacemos para ti.</span></li>
            <li><AiOutlineGift size={22} /><strong>En abonos</strong><span>Apártala con el 50% y paga el resto semanal, quincenal o mensual.</span></li>
            <li><AiOutlineCar size={22} /><strong>A tu puerta</strong><span>Entregamos en Huejutla, San Felipe, Jaltocan, Tehuetlán y Tampico.</span></li>
            <li><AiOutlineSafetyCertificate size={22} /><strong>En la tienda</strong><span>Recógela en el local de Huejutla y pruébatela antes de llevártela.</span></li>
          </ol>
        </div>
      </section>
      </Seccion>

      {/* ═══════════ NOTICIAS ═══════════ */}
      <Seccion id="inicio.noticias" nombre="Noticias y novedades">
      {noticiasHome.length > 0 && (
        <section className="nv">
          <div className="rl-cabeza">
            <h2>Del <em>blog</em></h2>
            <Link to="/noticias" className="rl-ver">Ver todas <AiOutlineArrowRight size={15} /></Link>
          </div>
          <div className="nv-fila">
            {noticiasHome.map((noticia) => (
              <Link to="/noticias" className="nv-nota" key={noticia.id}>
                <span className="nv-foto"><img src={optimizarImagen(noticia.imagen, 600) || "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80"} alt="" loading="lazy" /></span>
                <strong>{noticia.titulo}</strong>
                <span>{noticia.contenido && noticia.contenido.length > 110 ? `${noticia.contenido.substring(0, 110)}…` : noticia.contenido}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      </Seccion>

      {/* ═══════════ CIERRE ═══════════ */}
      <Seccion id="inicio.cta" nombre="Invitación al catálogo">
      <section className="ci">
        <div className="ci-tira" aria-hidden="true">
          {[...visibles, ...visibles].slice(0, 14).map((p: any, i: number) => (
            <img key={i} src={optimizarImagen(p.imagen_principal, 260)} alt="" loading="lazy" />
          ))}
        </div>
        <div className="ci-texto">
          <h2>¿Ya encontraste <em>tu brillo</em>?</h2>
          <p>Más de {productosDestacados.length || 90} piezas entre anillos, cadenas, aretes, pulseras y esclavas.</p>
          <div className="ci-acciones">
            <Link to="/catalogo-publico" className="ci-btn">Ver el catálogo <AiOutlineArrowRight size={16} /></Link>
            <Link to="/registro" className="ci-btn ci-btn--sec">Crear mi cuenta</Link>
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
