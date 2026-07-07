import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productsAPI, promocionesAPI, contentAPI } from "../../services/api";
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

const SVG_PH = `data:image/svg+xml;utf8,<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="600" fill="%230d0d0d"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="22" fill="%23ECB2C3" font-family="serif">Diana Laura</text></svg>`;

const JDL_IMG_1 = 'https://res.cloudinary.com/dltvkwwq4/image/upload/v1783360989/imagen_1_fmfuzd.jpg';

const InicioScreen: React.FC = () => {
    const navigate = useNavigate();
    const [productos, setProductos]     = useState<Producto[]>([]);
    const [categorias, setCategorias]   = useState<Categoria[]>([]);
    const [promociones, setPromociones] = useState<Promo[]>([]);
    const [loading, setLoading]         = useState(true);
    const [novedades, setNovedades]     = useState<any[]>([]);

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
                    setProductos(todos.slice(0, 12));
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

    const promoLabel = (p: Promo) =>
        p.tipo === 'porcentaje' ? `${p.valor_descuento}% OFF` : `-$${p.valor_descuento}`;

    const precioFinal = (p: Producto) =>
        p.precio_promocion ?? p.precio_oferta ?? p.precio_venta;

    const hayDesc = (p: Producto) => precioFinal(p) < p.precio_venta;

    /* productos con imagen al frente para el hero */
    const conImg    = productos.filter(p => p.imagen_principal);
    const heroProd  = conImg[0] || productos[0];
    const featProds = productos.filter(p => p.id !== heroProd?.id).slice(0, 3);
    const gridProds = productos.slice(0, 8);

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

            {/* ── HERO FULL ── */}
            <section className="tl-hero">
                {/* fondo: imagen JDL fija de Cloudinary */}
                <div className="tl-hero-bg">
                    <img src={JDL_IMG_1} alt="Diana Laura Joyería" />
                    <div className="tl-hero-bg-overlay" />
                </div>

                {/* contenido sobre el fondo */}
                <div className="tl-hero-content">
                    <div className="tl-hero-pill">
                        {nombre ? `Bienvenida, ${nombre}` : "Colección 2025"}
                    </div>
                    <h1 className="tl-hero-h1">
                        Piezas que<br />
                        <em>te definen</em>
                    </h1>
                    <p className="tl-hero-sub">
                        Joyería artesanal con acabados de alta calidad.<br />
                        Diseñada para que brilles.
                    </p>
                    <div className="tl-hero-actions">
                        <button className="tl-btn-rosa" onClick={() => navigate("/catalogo")}>
                            Explorar Colección
                        </button>
                        <button className="tl-btn-ghost" onClick={() => navigate("/favoritos")}>
                            Mis Favoritos
                        </button>
                    </div>
                </div>

                {/* tarjeta de producto flotante */}
                {heroProd && (
                    <div className="tl-hero-card" onClick={() => navigate("/catalogo")}>
                        <div className="tl-hero-card-img">
                            <img
                                src={heroProd.imagen_principal || SVG_PH}
                                alt={heroProd.nombre}
                                onError={e => { (e.target as HTMLImageElement).src = SVG_PH; }}
                            />
                        </div>
                        <div className="tl-hero-card-info">
                            {heroProd.categoria_nombre && (
                                <span className="tl-hero-card-cat">{heroProd.categoria_nombre}</span>
                            )}
                            <span className="tl-hero-card-nombre">{heroProd.nombre}</span>
                            <span className="tl-hero-card-precio">
                                ${Number(precioFinal(heroProd)).toLocaleString('es-MX')}
                            </span>
                        </div>
                        <div className="tl-hero-card-arrow">→</div>
                    </div>
                )}

                {/* stats esquina */}
                <div className="tl-hero-stats">
                    {[["500+","Diseños"],["1K+","Clientas"],["100%","Artesanal"]].map(([n,l],i,arr) => (
                        <React.Fragment key={i}>
                            <div className="tl-hstat">
                                <strong>{n}</strong>
                                <span>{l}</span>
                            </div>
                            {i < arr.length-1 && <div className="tl-hstat-sep"/>}
                        </React.Fragment>
                    ))}
                </div>
            </section>

            {/* ── FRANJA CATEGORÍAS ── */}
            {categorias.length > 0 && (
                <nav className="tl-cats-bar">
                    {categorias.slice(0, 7).map(c => (
                        <button
                            key={c.id}
                            className="tl-cat-pill"
                            onClick={() => navigate("/catalogo")}
                        >
                            {c.nombre}
                        </button>
                    ))}
                    <button className="tl-cats-cta" onClick={() => navigate("/catalogo")}>
                        Ver catálogo →
                    </button>
                </nav>
            )}

            {/* ── DESTACADOS EDITORIALES (3 tarjetas horizontales grandes) ── */}
            {featProds.length > 0 && (
                <section className="tl-editorial">
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
                                    className={`tl-ed-card tl-ed-card--${i}`}
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

            {/* ── GRID PRODUCTOS ── */}
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
                    <div className="tl-carrusel">
                        {gridProds.map(p => {
                            const precio = precioFinal(p);
                            const desc   = hayDesc(p);
                            return (
                                <div key={p.id} className="tl-prod-card" onClick={() => navigate("/catalogo")}>
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

            {/* ── STATS BAND ── */}
            <div className="tl-stats-band">
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

            {/* ── BANNER EDITORIAL GRANDE ── */}
            <section className="tl-banner-ed">
                    <div className="tl-banner-ed-img">
                        <img
                            src={conImg[1]?.imagen_principal || JDL_IMG_1}
                            alt="Diana Laura Joyería"
                            onError={e => { (e.target as HTMLImageElement).src = JDL_IMG_1; }}
                        />
                        <div className="tl-banner-ed-overlay" />
                    </div>
                    <div className="tl-banner-ed-content">
                        <span className="tl-cta-eyebrow">◆ Diseño a tu medida ◆</span>
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

            {/* ── NOVEDADES ── */}
            {novedades.length > 0 && (
                <section className="tl-nov-section">
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
                    <div className="tl-nov-grid">
                        {novedades.map((n: any) => (
                            <article key={n.id} className="tl-nov-card" onClick={() => navigate("/noticias")}>
                                <div className="tl-nov-img">
                                    {n.imagen
                                        ? <img src={n.imagen} alt={n.titulo} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                                        : <div className="tl-nov-img-ph">◆</div>
                                    }
                                    <div className="tl-nov-img-overlay" />
                                </div>
                                <div className="tl-nov-body">
                                    <span className="tl-nov-fecha">
                                        {new Date(n.fecha).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })}
                                    </span>
                                    <h3 className="tl-nov-titulo">{n.titulo}</h3>
                                    <p className="tl-nov-texto">
                                        {n.contenido.length > 120 ? n.contenido.slice(0, 120) + '...' : n.contenido}
                                    </p>
                                    <span className="tl-nov-link">Leer más →</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {/* ── CTA FINAL ── */}
            <section className="tl-cta-band">
                <div className="tl-cta-inner">
                    <span className="tl-cta-eyebrow">◆ Escríbenos ◆</span>
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
