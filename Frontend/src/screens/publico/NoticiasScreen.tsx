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
    },
    {
      id: 2,
      titulo: "Promoción Especial: 20% OFF",
      fecha: "25 de enero de 2026",
      contenido:
        "En toda nuestra colección de aretes y collares. Válido hasta fin de mes en compras online. Aprovecha esta increíble oportunidad.",
    },
    {
      id: 3,
      titulo: "Materiales Sostenibles",
      fecha: "24 de enero de 2026",
      contenido:
        "Nos comprometemos con el medio ambiente. Nuestras nuevas colecciones utilizan materiales eco-amigables y procesos responsables.",
    },
    {
      id: 4,
      titulo: "Nuevas Colecciones Disponibles",
      fecha: "23 de enero de 2026",
      contenido:
        "Hemos añadido nuevas piezas a nuestro catálogo. Cada una diseñada con cuidado y atención al detalle.",
    },
    {
      id: 5,
      titulo: "Envío Gratuito en Compras",
      fecha: "22 de enero de 2026",
      contenido:
        "Disfruta de envío gratuito en todas las compras mayores a $50. Rápido, seguro y confiable.",
    },
    {
      id: 6,
      titulo: "Programa de Lealtad",
      fecha: "21 de enero de 2026",
      contenido:
        "Únete a nuestro programa de lealtad y obtén beneficios exclusivos, descuentos especiales y acceso anticipado a nuevas colecciones.",
    },
  ];

  return (
    <div className="noticias-container">
      <PublicHeader />

      {/* HERO SECTION */}
      <section className="noticias-hero">
        <div className="container-lg">
          <h1 className="noticias-title">Noticias y Novedades</h1>
          <p className="noticias-subtitle">
            Mantente al día con nuestras últimas colecciones y promociones
          </p>
        </div>
      </section>

      {/* NOTICIAS */}
      <section className="noticias-section">
        <div className="container-lg">
          <div className="noticias-grid">
            {noticias.map((noticia) => (
              <article key={noticia.id} className="noticia-item">
                <div className="noticia-image"></div>
                <div className="noticia-content">
                  <h3 className="noticia-titulo">{noticia.titulo}</h3>
                  <p className="noticia-fecha">
                    <i className="fas fa-calendar-alt"></i> {noticia.fecha}
                  </p>
                  <p className="noticia-descripcion">{noticia.contenido}</p>
                  <a href="#" className="noticia-link">
                    Leer más →
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
