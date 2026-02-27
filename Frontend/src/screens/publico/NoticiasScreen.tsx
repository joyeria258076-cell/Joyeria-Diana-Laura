import React from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import "./NoticiasScreen.css";

const NoticiasScreen: React.FC = () => {
  const noticias = [
    {
      id: 1,
      titulo: "Lanzamiento Colección Primavera",
      fecha: "26 de enero de 2026",
      contenido:
        "Descubre nuestra nueva línea inspirada en los tonos florales de la primavera. Diseños frescos y elegantes que celebran la renovación de la estación.",
      categoria: "Colecciones",
      imagen: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=900&q=80&fit=crop",
    },
    {
      id: 2,
      titulo: "Promoción Especial: 20% OFF",
      fecha: "25 de enero de 2026",
      contenido:
        "En toda nuestra colección de aretes y collares. Válido hasta fin de mes en compras online. Aprovecha esta increíble oportunidad.",
      categoria: "Promociones",
      imagen: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=700&q=80&fit=crop",
    },
    {
      id: 3,
      titulo: "Materiales Sostenibles",
      fecha: "24 de enero de 2026",
      contenido:
        "Nos comprometemos con el medio ambiente. Nuestras nuevas colecciones utilizan materiales eco-amigables y procesos responsables.",
      categoria: "Sustentabilidad",
      imagen: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=700&q=80&fit=crop",
    },
    {
      id: 4,
      titulo: "Nuevas Colecciones Disponibles",
      fecha: "23 de enero de 2026",
      contenido:
        "Hemos añadido nuevas piezas a nuestro catálogo. Cada una diseñada con cuidado y atención al detalle.",
      categoria: "Catálogo",
      imagen: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=700&q=80&fit=crop",
    },
    {
      id: 5,
      titulo: "Envío Gratuito en Compras",
      fecha: "22 de enero de 2026",
      contenido:
        "Disfruta de envío gratuito en todas las compras mayores a $50. Rápido, seguro y confiable.",
      categoria: "Beneficios",
      imagen: "https://images.unsplash.com/photo-1619119069152-a2b331eb392a?w=700&q=80&fit=crop",
    },
    {
      id: 6,
      titulo: "Programa de Lealtad",
      fecha: "21 de enero de 2026",
      contenido:
        "Únete a nuestro programa de lealtad y obtén beneficios exclusivos, descuentos especiales y acceso anticipado a nuevas colecciones.",
      categoria: "Membresía",
      imagen: "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=700&q=80&fit=crop",
    },
  ];

  return (
    <div className="noticias-container">
      <PublicHeader />

      {/* HERO SECTION */}
      <section className="noticias-hero">
        <div className="container-lg">
          <div className="noticias-hero-inner">
            <p className="noticias-hero-tag">Diario de Novedades</p>
            <h1 className="noticias-title">
              Noticias &amp; <span>Novedades</span>
            </h1>
            <p className="noticias-subtitle">
              Mantente al día con nuestras últimas colecciones, promociones exclusivas y noticias del mundo de la joyería.
            </p>
            <div className="noticias-stats">
              <div className="noticias-stat">
                <strong>6</strong>
                <span>Artículos</span>
              </div>
              <div className="noticias-stat">
                <strong>2026</strong>
                <span>Temporada</span>
              </div>
              <div className="noticias-stat">
                <strong>4</strong>
                <span>Colecciones</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NOTICIAS */}
      <section className="noticias-section">
        <div className="container-lg">
          <div className="noticias-grid">
            {noticias.map((noticia) => (
              <article key={noticia.id} className="noticia-item">
                <div className="noticia-image">
                  <img src={noticia.imagen} alt={noticia.titulo} loading="lazy" />
                  <span className="noticia-category">{noticia.categoria}</span>
                </div>
                <div className="noticia-content">
                  <p className="noticia-fecha">
                    <i className="fas fa-calendar-alt" />
                    {noticia.fecha}
                  </p>
                  <h3 className="noticia-titulo">{noticia.titulo}</h3>
                  <div className="noticia-divider" />
                  <p className="noticia-descripcion">{noticia.contenido}</p>
                  <a href="#" className="noticia-link">
                    Leer artículo <span className="link-arrow">→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default NoticiasScreen;