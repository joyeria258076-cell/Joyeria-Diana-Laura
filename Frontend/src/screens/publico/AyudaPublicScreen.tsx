import React from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import "./AyudaPublicScreen.css";

const Ayuda: React.FC = () => {
  return (
    <div className="ayuda-publica-wrapper">
      <PublicHeader />

      {/* HERO SECTION */}
      <section className="ayuda-hero-section">
        <div className="ayuda-hero-inner">
          <span className="ayuda-tag">Soporte & Asistencia</span>
          <div className="section-header">
            <h1>Centro de <span>Ayuda</span></h1>
            <p>
              Resolvemos tus dudas para que tu única preocupación sea lucir nuestras joyas con elegancia.
            </p>
          </div>
        </div>
      </section>

      <div className="page-container">
        <div className="faq-grid">

          {/* ─── FAQ ACCORDION ─── */}
          <section className="faq-section">
            <h2>Preguntas Frecuentes</h2>
            <div className="faq-list">

              <details>
                <summary>
                  ¿Cómo rastreo mi pedido?
                  <span className="summary-icon">+</span>
                </summary>
                <p className="faq-answer">
                  Puedes verificar el estado de tu envío en tiempo real desde la sección "Mis Pedidos"
                  en tu cuenta. Recibirás también notificaciones automáticas por correo en cada etapa del proceso.
                </p>
              </details>

              <details>
                <summary>
                  ¿Las joyas tienen certificado de autenticidad?
                  <span className="summary-icon">+</span>
                </summary>
                <p className="faq-answer">
                  Sí, todas nuestras piezas de diamantes y metales preciosos incluyen certificado de
                  autenticidad emitido por laboratorios reconocidos internacionalmente. Viene incluido
                  con cada compra sin costo adicional.
                </p>
              </details>

              <details>
                <summary>
                  ¿Realizan envíos internacionales?
                  <span className="summary-icon">+</span>
                </summary>
                <p className="faq-answer">
                  Actualmente realizamos envíos a todo México y Estados Unidos con seguro incluido.
                  Estamos trabajando para expandir nuestra cobertura a más países próximamente.
                </p>
              </details>

              <details>
                <summary>
                  ¿Cuál es la política de devoluciones?
                  <span className="summary-icon">+</span>
                </summary>
                <p className="faq-answer">
                  Aceptamos devoluciones dentro de los primeros 30 días desde la recepción, siempre que
                  las piezas estén en perfectas condiciones con su empaque original. El proceso es simple
                  y sin complicaciones.
                </p>
              </details>

              <details>
                <summary>
                  ¿Ofrecen servicio de personalización?
                  <span className="summary-icon">+</span>
                </summary>
                <p className="faq-answer">
                  Sí, contamos con un equipo de diseño dedicado a crear piezas únicas. Puedes agendar
                  una consulta gratuita desde nuestra sección de contacto para discutir tu visión
                  y recibir una cotización personalizada.
                </p>
              </details>

            </div>
          </section>

          {/* ─── SUPPORT CARD ─── */}
          <section className="support-card">
            <div className="support-avatar">
              <i className="fas fa-headset" />
            </div>
            <h3>¿Aún tienes dudas?</h3>
            <p>Nuestro equipo especializado está disponible para ayudarte en todo momento.</p>

            <div className="support-divider" />

            <button className="btn-contact">
              <i className="fas fa-comments" style={{ marginRight: '0.6rem' }} />
              Chat en Vivo
            </button>

            <p className="email-link">soporte@dianalaura.com</p>

            <p className="support-status">
              <span className="status-dot" />
              En línea ahora
            </p>
          </section>

        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default Ayuda;