import React from "react";
import PublicHeader from "../../components/PublicHeader"; 
import PublicFooter from "../../components/PublicFooter"; 
import "./AyudaPublicScreen.css";

const Ayuda: React.FC = () => {
  return (
    /* Wrapper para asegurar fondo negro en toda la página */
    <div className="ayuda-publica-wrapper">
      <PublicHeader />

      <div className="page-container fade-in">
        <div className="section-header">
          <h1>🆘 Centro de Ayuda</h1>
          <p>Resolvemos tus dudas para que tu única preocupación sea lucir nuestras joyas.</p>
        </div>

        <div className="faq-grid">
          <section className="faq-section">
            <h2>Preguntas Frecuentes</h2>
            <div className="faq-list">
              <details>
                <summary>¿Cómo rastreo mi pedido?</summary>
                <p>Puedes verificar el estado en tiempo real desde la sección "Mis Pedidos".</p>
              </details>
              <details>
                <summary>¿Las joyas tienen certificado?</summary>
                <p>Sí, todas nuestras piezas de diamantes y metales preciosos incluyen certificado de autenticidad.</p>
              </details>
              <details>
                <summary>¿Realizan envíos internacionales?</summary>
                <p>Actualmente realizamos envíos a todo México y Estados Unidos.</p>
              </details>
            </div>
          </section>

          <section className="support-card">
            <h3>¿Aún tienes dudas?</h3>
            <p>Nuestro equipo de soporte está disponible para ti.</p>
            <button className="btn-contact">Chat en Vivo</button>
            <p className="email-link">soporte@dianalaura.com</p>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default Ayuda;