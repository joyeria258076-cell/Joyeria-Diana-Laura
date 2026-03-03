import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { contentAPI } from "../../services/api";
import "./NoticiasScreen.css";

const NoticiasScreen: React.FC = () => {
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageConfig, setPageConfig] = useState({
    titulo: "",
    contenido: "",
    imagen: "", 
  });

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const configRes = await contentAPI.getPageConfig("noticias");
        if (configRes) {
          setPageConfig({
            titulo: configRes.titulo || "",
            contenido: configRes.contenido || "",
            imagen: configRes.imagen || "", 
          });
        }
        const noticiasRes = await contentAPI.getNoticias();
        if (noticiasRes) {
          setNoticias(noticiasRes.filter((n: any) => n.activa));
        }
      } catch (error) {
        console.error("Error cargando la BD:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDatos();
  }, []);

  const renderTituloConSpan = (titulo: string) => {
    // <-- CORRECCIÓN: Si no hay título, devolvemos null para que no ponga "Novedades" por defecto
    if (!titulo) return null; 
    const palabras = titulo.trim().split(" ");
    if (palabras.length === 1) return <span>{titulo}</span>;
    const ultimaPalabra = palabras.pop();
    return <>{palabras.join(" ")} <span>{ultimaPalabra}</span></>;
  };

  const formatearFecha = (f: string) => {
    if (!f) return "Próximamente";
    if (f.includes("de")) return f;
    try {
      return new Date(f).toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
      });
    } catch { return f; }
  };

  const imgFallback =
    "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=900&q=80&fit=crop";

  // Primera noticia: hero horizontal
  const featured = noticias[0];
  // Noticias 2 y 3: columna lateral del hero
  const sidePair = noticias.slice(1, 3);
  // Resto: grid de 4 abajo
  const rest = noticias.slice(3);

  // <-- Calculamos categorías únicas para la estadística dinámica
  const coleccionesUnicas = new Set(noticias.map(n => n.categoria).filter(Boolean)).size;

  return (
    <div className="noticias-container">
      <PublicHeader />

      {/* ── HERO ── */}
      <section 
        className="noticias-hero"
        style={{
          // <-- Inyectamos la imagen de fondo si existe
          backgroundImage: pageConfig.imagen ? `url(${pageConfig.imagen})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Agregamos una capa oscura sutil (overlay) para que el texto siempre se lea bien */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 0 }}></div>
        
        <div className="container-lg" style={{ position: 'relative', zIndex: 1 }}>
          <div className="noticias-hero-inner">
            <p className="noticias-hero-tag">
              <span className="tag-dot" />
              Diario de Novedades
            </p>
            <h1 className="noticias-title">
              {renderTituloConSpan(pageConfig.titulo)}
            </h1>
            <p className="noticias-subtitle">{pageConfig.contenido}</p>
            <div className="noticias-stats">
              <div className="noticias-stat">
                <strong>{loading ? "—" : noticias.length}</strong>
                <span>Artículos</span>
              </div>
              <div className="noticias-stat">
                {/* <-- Año dinámico */}
                <strong>{loading ? "—" : new Date().getFullYear()}</strong>
                <span>Temporada</span>
              </div>
              <div className="noticias-stat">
                {/* <-- Colecciones (categorías) dinámicas */}
                <strong>{loading ? "—" : coleccionesUnicas}</strong>
                <span>Colecciones</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NOTICIAS ── */}
      <section className="noticias-section">
        <div className="container-lg">

          {/* LOADING */}
          {loading && (
            <div className="noticias-loading">
              <div className="loading-spinner">
                <div className="spinner-ring" />
                <div className="spinner-ring spinner-ring--2" />
                <div className="spinner-dot" />
              </div>
              <p className="loading-text">Cargando novedades</p>
              <div className="loading-dots"><span /><span /><span /></div>
            </div>
          )}

          {/* EMPTY */}
          {!loading && noticias.length === 0 && (
            <div className="noticias-empty">
              <div className="empty-icon">✦</div>
              <p className="empty-title">Sin novedades por el momento</p>
              <p className="empty-sub">Pronto publicaremos nuevos artículos.</p>
            </div>
          )}

          {/* GRID */}
          {!loading && noticias.length > 0 && (
            <>
              {/* FILA 1 — igual que el original: featured izquierda + par derecha */}
              <div className="noticias-top-row">

                {/* FEATURED — imagen izq, texto der */}
                {featured && (
                  <article className="noticia-item noticia-item--featured">
                    <div className="noticia-image">
                      <img src={featured.imagen || imgFallback} alt={featured.titulo} loading="lazy" />
                      <span className="noticia-category">{featured.categoria || "Novedades"}</span>
                      <div className="img-accent" />
                    </div>
                    <div className="noticia-content">
                      <p className="noticia-fecha">
                        <i className="fas fa-calendar-alt" />
                        {formatearFecha(featured.fecha)}
                      </p>
                      <h2 className="noticia-titulo">{featured.titulo}</h2>
                      <div className="noticia-divider" />
                      <p className="noticia-descripcion">{featured.contenido}</p>
                      <a href="#" className="noticia-link">
                        Leer artículo <span className="link-arrow">→</span>
                      </a>
                    </div>
                  </article>
                )}

                {/* COLUMNA LATERAL — 2 tarjetas apiladas */}
                {sidePair.length > 0 && (
                  <div className="noticias-side-col">
                    {sidePair.map((n) => (
                      <article key={n.id} className="noticia-item noticia-item--side">
                        <div className="noticia-image">
                          <img src={n.imagen || imgFallback} alt={n.titulo} loading="lazy" />
                          <span className="noticia-category">{n.categoria || "Novedades"}</span>
                          <div className="img-accent" />
                        </div>
                        <div className="noticia-content">
                          <p className="noticia-fecha">
                            <i className="fas fa-calendar-alt" />
                            {formatearFecha(n.fecha)}
                          </p>
                          <h3 className="noticia-titulo">{n.titulo}</h3>
                          <div className="noticia-divider" />
                          <p className="noticia-descripcion">{n.contenido}</p>
                          <a href="#" className="noticia-link">
                            Leer artículo <span className="link-arrow">→</span>
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* FILA 2 — grid de 4 igual que el original */}
              {rest.length > 0 && (
                <div className="noticias-bottom-grid">
                  {rest.map((n) => (
                    <article key={n.id} className="noticia-item">
                      <div className="noticia-image">
                        <img src={n.imagen || imgFallback} alt={n.titulo} loading="lazy" />
                        <span className="noticia-category">{n.categoria || "Novedades"}</span>
                        <div className="img-accent" />
                      </div>
                      <div className="noticia-content">
                        <p className="noticia-fecha">
                          <i className="fas fa-calendar-alt" />
                          {formatearFecha(n.fecha)}
                        </p>
                        <h3 className="noticia-titulo">{n.titulo}</h3>
                        <div className="noticia-divider" />
                        <p className="noticia-descripcion">{n.contenido}</p>
                        <a href="#" className="noticia-link">
                          Leer artículo <span className="link-arrow">→</span>
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default NoticiasScreen;