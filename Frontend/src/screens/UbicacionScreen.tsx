// Ruta: src/screens/UbicacionScreen.tsx
import React from "react";
import "../styles/UbicacionScreen.css";

const Ubicacion: React.FC = () => {
  return (
    <div className="page-container fade-in">
      <div className="section-header">
        <h1>📍 Nuestra Ubicación</h1>
        <p>Visítanos en nuestra boutique exclusiva para una experiencia personalizada.</p>
      </div>
      
      <div className="map-card">
        <div className="map-container">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.4804564344!2d-99.1674!3d19.4326!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDI1JzU3LjQiTiA5OcKwMTAnMDIuNiJX!5e0!3m2!1ses!2smx!4v1625500000000!5m2!1ses!2smx" 
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
  );
};

export default Ubicacion;