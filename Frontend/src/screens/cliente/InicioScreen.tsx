import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productsAPI, promocionesAPI, contentAPI } from "../../services/api";
import { initScrollReveal } from "../../utils/scrollReveal";
import "./InicioScreen.css";

interface Producto {
    id: number;
    nombre: string;
    precio_venta: number;
    precio_oferta?: number;
    precio_promocion?: number;
    imagen_principal?: string;
    categoria_nombre?: string;
    es_nuevo?: boolean;
    stock_actual: number;
}

interface Categoria { id: number; nombre: string; }
interface Promo { nombre: string; tipo: string; valor_descuento: number; fecha_fin?: string; }

const SVG_PH = `data:image/svg+xml;utf8,<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="600" fill="%23141414"/><g transform="translate(300,300)" stroke="%23594936" stroke-width="1.5" fill="none" opacity="0.7"><path d="M-22,-14 L22,-14 L32,-2 L0,34 L-32,-2 Z"/><path d="M-22,-14 L0,-2 L22,-14 M-32,-2 L32,-2 M0,-2 L0,34"/></g></svg>`;

const JDL_IMG_2 = 'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto/joyeria/imagenes/imagen_usar_2.jpg';
const JDL_HERO_IMAGENES = [
    'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto/joyeria/imagenes/imagen_usar_1.jpg',
    'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto/joyeria/imagenes/imagen_usar_3.jpg',
    'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto/joyeria/imagenes/imagen_usar_6.jpg',
    'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto/joyeria/imagenes/imagen_usar_8.jpg',
    'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto/joyeria/imagenes/imagen_usar_13.jpg',
    'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto/joyeria/imagenes/imagen_usar_19.jpg',
    'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto/joyeria/imagenes/imagen_usar_21.jpg',
];

const InicioScreen: React.FC = () => {
    const navigate = useNavigate();
    const [productos, setProductos]     = useState<Producto[]>([]);
    const [categorias, setCategorias]   = useState<Categoria[]>([]);
    const [promociones, setPromociones] = useState<Promo[]>([]);
    const [loading, setLoading]         = useState(true);
    const [novedades, setNovedades]     = useState<any[]>([]);
    const [heroIdx, setHeroIdx]         = useState(0);

    const nombre = (() => {
        try {
            const u = localStorage.getItem('diana_laura_user');
            if (u) { const p = JSON.parse(u); return p.nombre || p.name || null; }
        } catch { /**/ }
        return null;
    })();

    useEffect(() => {
        const load = async () => {
            try {
                const [resCats, resProds, resPromos] = await Promise.allSettled([
                    productsAPI.getCategories(),
                    productsAPI.getProductsByCategories(),
                    promocionesAPI.getActivas(),
                ]);
                if (resCats.status === 'fulfilled') {
                    setCategorias(Array.isArray(resCats.value?.data) ? resCats.value.data : []);
                }
                if (resProds.status === 'fulfilled') {
                    // getProductsByCategories devuelve [{categoria_nombre, productos:[...]}, ...]
                    const cats: any[] = Array.isArray(resProds.value?.data) ? resProds.value.data : [];
                    const todos: Producto[] = cats.flatMap((c: any) => Array.isArray(c.productos) ? c.productos : []);
                    setProductos(todos.slice(0, 16));
                }
                if (resPromos.status === 'fulfilled') {
                    setPromociones(Array.isArray(resPromos.value?.data) ? resPromos.value.data : []);
                }
                try {
                    const resNov = await contentAPI.getNoticias();
                    const arr = Array.isArray(resNov) ? resNov : (Array.isArray(resNov?.data) ? resNov.data : []);
                    setNovedades(arr.filter((n: any) => n.activa).slice(0, 3));
                } catch { /* sin novedades */ }
            } catch { /**/ } finally { setLoading(false); }
        };
        load();
    }, []);

    useEffect(() => {
        const cleanup = initScrollReveal();
        return cleanup;
    }, [loading, productos, novedades]);

    useEffect(() => {
        const t = setInterval(() => {
            setHeroIdx(prev => (prev + 1) % JDL_HERO_IMAGENES.length);
        }, 7000);
        return () => clearInterval(t);
    }, []);

    const promoLabel = (p: Promo) =>
        p.tipo === 'porcentaje' ? `${p.valor_descuento}% OFF` : `-$${p.valor_descuento}`;

    const precioFinal = (p: Producto) =>
        p.precio_promocion ?? p.precio_oferta ?? p.precio_venta;

    const hayDesc = (p: Producto) => precioFinal(p) < p.precio_venta;

    const conImg    = productos.filter(p => p.imagen_principal);
    const featProds = productos.slice(0, 3);
    const gridProds = productos.slice(3, 11);

    /* imagen representativa por categoría, tomada de productos reales (sin inventar assets) */
    const imagenDeCategoria = (nombreCat: string) =>
        productos.find(p => p.categoria_nombre === nombreCat && p.imagen_principal)?.imagen_principal || SVG_PH;

    return (
        <div className="tl-page">

            {/* ── TICKER ── */}
            {promociones.length > 0 && (
                <div className="tl-ticker">
                    <span className="tl-ticker-badge">OFERTAS</span>
                    <div className="tl-ticker-wrap">
                        <div className="tl-ticker-track">
                            {[...promociones, ...promociones].map((p, i) => (
                                <span key={i} className="tl-ticker-item">
                                    <strong>{p.nombre}</strong> — {promoLabel(p)}
                                    {p.fecha_fin && (
                                        <em> · Hasta {new Date(p.fecha_fin).toLocaleDateString('es-MX',{day:'numeric',month:'short'})}</em>
                                    )}
                                    <span className="tl-ticker-sep">◆</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── HERO CINEMATOGRÁFICO — centrado, un solo foco ── */}
            <section className="tl-hero">
                <div className="tl-hero-bg">
                    {JDL_HERO_IMAGENES.map((src, i) => (
                        <img
                            key={src}
                            src={src}
                            alt="Diana Laura Joyería"
                            className={i === heroIdx ? 'is-active' : ''}
                        />
                    ))}
                    <div className="tl-hero-bg-overlay" />
                </div>

                <div className="tl-hero-content">
                    <span className="tl-hero-eyebrow">
                        {nombre ? `Bienvenid@, ${nombre}` : "Joyería Diana Laura"}
                    </span>
                    <h1 className="tl-hero-h1">Cada pieza<br /><em>cuenta una historia</em></h1>
                    <p className="tl-hero-sub">Joyería artesanal con acabados de alta calidad, diseñada para que brilles.</p>
                    <button className="tl-btn-rosa" onClick={() => navigate("/catalogo")}>
                        Explorar Colección
                    </button>
                </div>
            </section>

            {/* ── CATEGORÍAS EN MOSAICO (bento) ── */}
            {categorias.length > 0 && (
                <section className="tl-cats-mosaic reveal-on-scroll">
                    <div className="tl-eyebrow-row">
                        <span className="tl-eyebrow-line-h" />
                        <span className="tl-eyebrow-txt">Explora por categoría</span>
                        <span className="tl-eyebrow-line-h" />
                    </div>
                    <div className="tl-mosaic-grid">
                        {categorias.slice(0, 5).map((c, i) => (
                            <button
                                key={c.id}
                                className={`tl-mosaic-tile tl-mosaic-tile--${i}`}
                                onClick={() => navigate("/catalogo")}
                            >
                                <img
                                    src={imagenDeCategoria(c.nombre)}
                                    alt={c.nombre}
                                    onError={e => { (e.target as HTMLImageElement).src = SVG_PH; }}
                                />
                                <div className="tl-mosaic-overlay" />
                                <span className="tl-mosaic-nombre">{c.nombre}</span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ── DESTACADOS EDITORIALES (3 tarjetas horizontales grandes) ── */}
            {featProds.length > 0 && (
                <section className="tl-editorial reveal-on-scroll">
                    <div className="tl-editorial-header">
                        <div className="tl-eyebrow-row">
                            <span className="tl-eyebrow-line-h" />
                            <span className="tl-eyebrow-txt">Piezas destacadas</span>
                            <span className="tl-eyebrow-line-h" />
                        </div>
                        <h2 className="tl-section-h2">Lo que más enamora</h2>
                    </div>
                    <div className="tl-ed-grid">
                        {featProds.map((p, i) => {
                            const precio = precioFinal(p);
                            const desc   = hayDesc(p);
                            return (
                                <div
                                    key={p.id}
                                    className={`tl-ed-card tl-ed-card--${i} reveal-stagger`}
                                    style={{ ['--stagger-i' as any]: i }}
                                    onClick={() => navigate("/catalogo")}
                                >
                                    <div className="tl-ed-img">
                                        <img
                                            src={p.imagen_principal || SVG_PH}
                                            alt={p.nombre}
                                            onError={e => { (e.target as HTMLImageElement).src = SVG_PH; }}
                                        />
                                        <div className="tl-ed-img-overlay" />
                                        {p.es_nuevo && <span className="tl-badge tl-badge--new">Nuevo</span>}
                                        {desc && <span className="tl-badge tl-badge--oferta">Oferta</span>}
                                    </div>
                                    <div className="tl-ed-body">
                                        {p.categoria_nombre && (
                                            <span className="tl-prod-cat">{p.categoria_nombre}</span>
                                        )}
                                        <h3 className="tl-ed-nombre">{p.nombre}</h3>
                                        <div className="tl-ed-precio-row">
                                            {desc && (
                                                <span className="tl-prod-precio-orig">
                                                    ${Number(p.precio_venta).toLocaleString('es-MX')}
                                                </span>
                                            )}
                                            <span className={`tl-ed-precio${desc ? " tl-ed-precio--oferta" : ""}`}>
                                                ${Number(precio).toLocaleString('es-MX')}
                                            </span>
                                        </div>
                                        <button className="tl-ed-btn">Ver pieza →</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ── STATS BAND ── */}
            <div className="tl-stats-band reveal-on-scroll">
                {[
                    { n:"500+",  l:"Diseños exclusivos" },
                    { n:"1,000+",l:"Clientas satisfechas" },
                    { n:"100%",  l:"Hecho a mano" },
                    { n:"5 ★",   l:"Calidad garantizada" },
                ].map((s,i,arr) => (
                    <React.Fragment key={i}>
                        <div className="tl-stat">
                            <strong>{s.n}</strong>
                            <span>{s.l}</span>
                        </div>
                        {i < arr.length-1 && <div className="tl-stat-sep"/>}
                    </React.Fragment>
                ))}
            </div>

            {/* ── GRID PRODUCTOS EN MOSAICO (bento, alturas variables) ── */}
            <section className="tl-section">
                <div className="tl-eyebrow-row">
                    <span className="tl-eyebrow-line-h" />
                    <span className="tl-eyebrow-txt">Selección</span>
                    <span className="tl-eyebrow-line-h" />
                </div>
                <div className="tl-section-head-row">
                    <h2 className="tl-section-h2">Productos recientes</h2>
                    <button className="tl-btn-ghost-sm" onClick={() => navigate("/catalogo")}>
                        Ver todos →
                    </button>
                </div>

                {loading ? (
                    <div className="tl-loading">Cargando joyas...</div>
                ) : gridProds.length === 0 ? (
                    <div className="tl-empty">No hay productos disponibles</div>
                ) : (
                    <div className="tl-bento-grid">
                        {gridProds.map((p, i) => {
                            const precio = precioFinal(p);
                            const desc   = hayDesc(p);
                            return (
                                <div
                                    key={p.id}
                                    className="tl-prod-card reveal-stagger"
                                    style={{ ['--stagger-i' as any]: i }}
                                    onClick={() => navigate("/catalogo")}
                                >
                                    <div className="tl-prod-img-wrap">
                                        <img
                                            src={p.imagen_principal || SVG_PH}
                                            alt={p.nombre}
                                            onError={e => { (e.target as HTMLImageElement).src = SVG_PH; }}
                                        />
                                        {p.es_nuevo && <span className="tl-badge tl-badge--new">Nuevo</span>}
                                        {p.precio_promocion && <span className="tl-badge tl-badge--promo">Promo</span>}
                                        {p.precio_oferta && !p.precio_promocion && (
                                            <span className="tl-badge tl-badge--oferta">Oferta</span>
                                        )}
                                        {p.stock_actual === 0 && (
                                            <span className="tl-badge tl-badge--agotado">Agotado</span>
                                        )}
                                        <div className="tl-prod-overlay"><span>Ver pieza →</span></div>
                                    </div>
                                    <div className="tl-prod-info">
                                        {p.categoria_nombre && (
                                            <span className="tl-prod-cat">{p.categoria_nombre}</span>
                                        )}
                                        <h3 className="tl-prod-nombre">{p.nombre}</h3>
                                        <div className="tl-prod-precios">
                                            {desc && (
                                                <span className="tl-prod-precio-orig">
                                                    ${Number(p.precio_venta).toLocaleString('es-MX')}
                                                </span>
                                            )}
                                            <span className={`tl-prod-precio${desc ? " tl-prod-precio--oferta" : ""}`}>
                                                ${Number(precio).toLocaleString('es-MX')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="tl-ver-mas">
                    <button className="tl-btn-rosa-outline" onClick={() => navigate("/catalogo")}>
                        Ver catálogo completo
                    </button>
                </div>
            </section>

            {/* ── BANNER EDITORIAL GRANDE ── */}
            <section className="tl-banner-ed reveal-on-scroll">
                    <div className="tl-banner-ed-img">
                        <img
                            src={conImg[1]?.imagen_principal || JDL_IMG_2}
                            alt="Diana Laura Joyería"
                            onError={e => { (e.target as HTMLImageElement).src = JDL_IMG_2; }}
                        />
                        <div className="tl-banner-ed-overlay" />
                    </div>
                    <div className="tl-banner-ed-content">
                        <span className="tl-cta-eyebrow">Diseño a tu medida</span>
                        <h2 className="tl-banner-ed-h2">
                            Cada joya,<br /><em>una historia</em>
                        </h2>
                        <p className="tl-banner-ed-desc">
                            Creamos piezas únicas que reflejan tu esencia.
                            Materiales de calidad y acabados artesanales.
                        </p>
                        <button className="tl-btn-rosa" onClick={() => navigate("/catalogo")}>
                            Descubrir más
                        </button>
                    </div>
                </section>

            {/* ── NOVEDADES — formato editorial en lista ── */}
            {novedades.length > 0 && (
                <section className="tl-nov-section reveal-on-scroll">
                    <div className="tl-eyebrow-row">
                        <span className="tl-eyebrow-line-h" />
                        <span className="tl-eyebrow-txt">Novedades</span>
                        <span className="tl-eyebrow-line-h" />
                    </div>
                    <div className="tl-section-head-row">
                        <h2 className="tl-section-h2">Lo último de Diana Laura</h2>
                        <button className="tl-btn-ghost-sm" onClick={() => navigate("/noticias")}>
                            Ver todas →
                        </button>
                    </div>
                    <div className="tl-nov-lista">
                        {novedades.map((n: any, i: number) => (
                            <article key={n.id} className="tl-nov-fila" onClick={() => navigate("/noticias")}>
                                <span className="tl-nov-index">{String(i + 1).padStart(2, '0')}</span>
                                <div className="tl-nov-img">
                                    {n.imagen
                                        ? <img src={n.imagen} alt={n.titulo} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                                        : <div className="tl-nov-img-ph" />
                                    }
                                </div>
                                <div className="tl-nov-body">
                                    <span className="tl-nov-fecha">
                                        {new Date(n.fecha).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })}
                                    </span>
                                    <h3 className="tl-nov-titulo">{n.titulo}</h3>
                                    <p className="tl-nov-texto">
                                        {n.contenido.length > 140 ? n.contenido.slice(0, 140) + '...' : n.contenido}
                                    </p>
                                </div>
                                <span className="tl-nov-arrow">→</span>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {/* ── CTA FINAL ── */}
            <section className="tl-cta-band reveal-on-scroll">
                <div className="tl-cta-inner">
                    <span className="tl-cta-eyebrow">Escríbenos</span>
                    <h2 className="tl-cta-h2">¿Buscas algo especial?</h2>
                    <p className="tl-cta-desc">
                        Cuéntanos qué tienes en mente y creamos juntas la joya perfecta para ti.
                    </p>
                    <button className="tl-btn-rosa" onClick={() => navigate("/contacto")}>
                        Solicitar diseño personalizado
                    </button>
                </div>
            </section>
        </div>
    );
};

export default InicioScreen;
