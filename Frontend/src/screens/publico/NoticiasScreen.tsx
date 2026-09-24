import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { contentAPI } from "../../services/api";
import "./NoticiasScreen.css";
import "../../styles/SitioSecciones.css";

const NoticiasScreen: React.FC = () => {
  const navigate = useNavigate();
  const [noticias, setNoticias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const noticiasRes = await contentAPI.getNoticias();
        const arr = Array.isArray(noticiasRes)
          ? noticiasRes
          : Array.isArray(noticiasRes?.data) ? noticiasRes.data : [];
        setNoticias(arr.filter((n: any) => n.activa));
      } catch (error) {
        console.error("Error cargando noticias:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDatos();
  }, []);

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

  return (
    <div className="noticias-container">
      <PublicHeader />

      {/* ── ENCABEZADO (mismo estilo que el Inicio) ── */}
      <header className="sx-head" style={{ padding: "4.5rem 1.5rem 0", marginBottom: 0 }}>
        <div className="sx-eyebrow">Blog Diana Laura</div>
        <h1 className="sx-title">Historias que <span>brillan</span></h1>
        <p className="sx-subtitle">Colecciones, cuidados, tendencias y todo lo nuevo de nuestra joyería.</p>
      </header>

      {/* ── NOTICIAS ── */}
      <section className="noticias-section">
        <div className="container-lg">

          {/* LOADING */}
          {loading && (
            <div className="noticias-loading">
              <div className="dl-loader-bars"><span /><span /><span /><span /></div>
              <p className="loading-text">Cargando novedades...</p>
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
                      <button className="noticia-link" onClick={() => navigate(`/noticias/${featured.id}`)}>
                        Leer artículo <span className="link-arrow">→</span>
                      </button>
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
                          <button className="noticia-link" onClick={() => navigate(`/noticias/${n.id}`)}>
                            Leer artículo <span className="link-arrow">→</span>
                          </button>
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
                        <button className="noticia-link" onClick={() => navigate(`/noticias/${n.id}`)}>
                          Leer artículo <span className="link-arrow">→</span>
                        </button>
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