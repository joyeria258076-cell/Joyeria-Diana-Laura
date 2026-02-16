import React from "react";
import PublicHeader from "../../components/PublicHeader"; // Importante para que aparezca la barra
import PublicFooter from "../../components/PublicFooter";
import "./UbicacionPublicScreen.css";

const UbicacionPublicScreen: React.FC = () => {
  return (
    <div className="ubicacion-publica-wrapper"> {/* Clase contenedora principal */}
      <PublicHeader />
      
      <div className="page-container fade-in">
        <div className="section-header">
          <h1>📍 Nuestra Ubicación</h1>
          <p>Visítanos en nuestra boutique exclusiva para una experiencia personalizada.</p>
        </div>
        
        <div className="map-card">
          <div className="map-container">
            <iframe 
              title="Mapa Ubicacion"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.539571588721!2d-99.1652643!3d19.4270245!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1ff35f5bd1563%3A0x6c666571936959!2sAv.%20Paseo%20de%20la%20Reforma%20456%2C%20Ju%C3%A1rez%2C%20Cuauht%C3%A9moc%2C%2006600%20Ciudad%20de%20M%C3%A9xico%2C%20CDMX!5e0!3m2!1ses-419!2smx!4v1700000000000" 
              width="100%" height="450" style={{ border: 0, borderRadius: '15px' }} allowFullScreen loading="lazy">
            </iframe>
          </div>
          <div className="address-details">
            <h3>Diana Laura Boutique</h3>
            <p>Av. de la Reforma 456, Piso 10, CDMX, México.</p>
            <p><strong>Horarios:</strong> Lunes a Sábado de 10:00 AM - 8:00 PM</p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default UbicacionPublicScreen;