import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { contentAPI, comentarioNoticiaAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import "./NoticiasScreen.css";
import "./NoticiaDetalleScreen.css";

interface Comentario {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  comentario: string;
  creado_en: string;
}

const NoticiaDetalleScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [noticia, setNoticia] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const esCliente = user?.rol === 'cliente';

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const res = await contentAPI.getNoticias();
        const arr = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        const encontrada = arr.find((n: any) => String(n.id) === id);
        setNoticia(encontrada || null);
      } catch { /* silently fallback */ }
      finally { setLoading(false); }
    };
    cargar();
  }, [id]);

  const cargarComentarios = async () => {
    if (!id) return;
    try {
      const res = await comentarioNoticiaAPI.getByNoticia(Number(id));
      const arr = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
      setComentarios(arr);
    } catch { /* silently fallback */ }
  };

  useEffect(() => { cargarComentarios(); }, [id]);

  const formatearFecha = (f: string) => {
    if (!f) return "";
    try {
      return new Date(f).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    } catch { return f; }
  };

  const handleComentar = async () => {
    if (!nuevoComentario.trim() || !id) return;
    setEnviando(true);
    try {
      await comentarioNoticiaAPI.crear(Number(id), nuevoComentario.trim());
      setNuevoComentario("");
      cargarComentarios();
    } catch {
      alert("No se pudo publicar tu comentario. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminarComentario = async (comentarioId: number) => {
    if (!window.confirm("¿Eliminar tu comentario?")) return;
    try {
      await comentarioNoticiaAPI.eliminar(comentarioId);
      cargarComentarios();
    } catch {
      alert("No se pudo eliminar el comentario.");
    }
  };

  const imgFallback = "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=1200&q=80&fit=crop";

  if (loading) {
    return (
      <div className="noticias-container">
        <PublicHeader />
        <div className="noticias-loading">
          <div className="dl-loader-bars"><span /><span /><span /><span /></div>
          <p className="loading-text">Cargando artículo...</p>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!noticia) {
    return (
      <div className="noticias-container">
        <PublicHeader />
        <div className="noticias-empty">
          <div className="empty-icon">✦</div>
          <p className="empty-title">Artículo no encontrado</p>
          <Link to="/noticias" className="nd-volver">← Volver al blog</Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="noticias-container">
      <PublicHeader />

      <article className="nd-article">
        <div className="container-lg nd-article-inner">
          <button className="nd-volver" onClick={() => navigate('/noticias')}>← Volver al blog</button>

          <span className="noticia-category nd-category">{noticia.categoria || "Novedades"}</span>
          <h1 className="nd-titulo">{noticia.titulo}</h1>
          <p className="nd-fecha">
            <i className="fas fa-calendar-alt" /> {formatearFecha(noticia.fecha)}
          </p>

          <div className="nd-imagen">
            <img src={noticia.imagen || imgFallback} alt={noticia.titulo} />
          </div>

          <div className="nd-contenido">
            {(noticia.contenido || "").split("\n").map((p: string, i: number) => p.trim() && <p key={i}>{p}</p>)}
          </div>
        </div>
      </article>

      <section className="nd-comentarios">
        <div className="container-lg nd-comentarios-inner">
          <h2 className="nd-comentarios-titulo">Comentarios ({comentarios.length})</h2>

          {esCliente ? (
            <div className="nd-comentario-form">
              <textarea
                value={nuevoComentario}
                onChange={e => setNuevoComentario(e.target.value)}
                placeholder="Escribe tu comentario..."
                rows={3}
              />
              <button onClick={handleComentar} disabled={enviando || !nuevoComentario.trim()}>
                {enviando ? "Publicando..." : "Publicar comentario"}
              </button>
            </div>
          ) : (
            <p className="nd-comentario-aviso">
              {user
                ? "Solo los clientes pueden comentar en el blog."
                : <>Inicia sesión como cliente para dejar un comentario. <Link to="/login">Iniciar sesión</Link></>}
            </p>
          )}

          {comentarios.length === 0 ? (
            <p className="nd-comentarios-vacio">Sé el primero en comentar este artículo.</p>
          ) : (
            <div className="nd-comentarios-lista">
              {comentarios.map(c => (
                <div key={c.id} className="nd-comentario">
                  <div className="nd-comentario-head">
                    <span className="nd-comentario-autor">{c.usuario_nombre}</span>
                    <span className="nd-comentario-fecha">{formatearFecha(c.creado_en)}</span>
                  </div>
                  <p className="nd-comentario-texto">{c.comentario}</p>
                  {user?.dbId === c.usuario_id && (
                    <button className="nd-comentario-eliminar" onClick={() => handleEliminarComentario(c.id)}>Eliminar</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default NoticiaDetalleScreen;
