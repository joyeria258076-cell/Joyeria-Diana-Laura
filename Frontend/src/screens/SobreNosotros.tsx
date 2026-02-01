// Ruta: src/screens/SobreNosotros.tsx
import React from "react";
import "../styles/SobreNosotros.css";

const SobreNosotros: React.FC = () => {
  return (
    <div className="sn-container fade-in">
      <section className="sn-hero">
        <h1>Nuestra Herencia</h1>
        <p>En Diana Laura, cada pieza cuenta una historia de elegancia y pasión artesanal.</p>
      </section>

      <div className="sn-grid">
        <div className="sn-card">
          <h3>Misión</h3>
          <p>Ofrecer joyería de alta calidad que realce la belleza natural y la confianza de cada mujer.</p>
        </div>
        <div className="sn-card">
          <h3>Artesanía</h3>
          <p>Utilizamos materiales premium y procesos hechos a mano para garantizar piezas únicas y duraderas.</p>
        </div>
      </div>

      <div className="sn-stats-banner">
        <div className="stat"><span>10+</span><p>Años de Tradición</p></div>
        <div className="stat"><span>5k+</span><p>Clientes Felices</p></div>
        <div className="stat"><span>100%</span><p>Oro Ético</p></div>
      </div>
    </div>
  );
};

export default SobreNosotros;