import React from "react";
import {
  AiOutlineEnvironment, AiOutlineClockCircle, AiOutlinePhone, AiOutlineGift,
} from "react-icons/ai";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import "./UbicacionPublicScreen.css";

/* ⚠️ DATOS DE LA SUCURSAL — PENDIENTES DE ACTUALIZAR
   Estos valores venían escritos a mano dentro del maquetado y apuntan a
   Paseo de la Reforma, Ciudad de México: son el texto de ejemplo con el
   que se armó la plantilla. La joyería está en Huejutla (lo dicen el lema
   del encabezado y las zonas de entrega del pie), así que la dirección,
   el mapa y el teléfono de aquí NO corresponden al negocio.

   Se agrupan aquí para poder corregirlos en un solo sitio. Para el mapa:
   buscar la dirección real en Google Maps → Compartir → Insertar un mapa
   → copiar la URL del src del iframe.

   El teléfono además no coincide con el del encabezado (771 555 1234) ni
   con el del pie (+1 555 123-4567): hay tres números distintos en el
   sitio. */
const SUCURSAL = {
  calle: "Av. de la Reforma 456, Piso 10",
  colonia: "Juárez, Cuauhtémoc",
  ciudad: "CDMX, México",
  resumen: "Av. de la Reforma 456, Piso 10 — Ciudad de México, CDMX",
  telefono: "+52 55 1234 5678",
  correo: "info@dianalaura.com",
  horarioDias: "Lunes a Sábado",
  horarioHoras: "10:00 AM – 8:00 PM",
  horarioCerrado: "Domingos: Cerrado",
  mapaSrc:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.539571588721!2d-99.1652643!3d19.4270245!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1ff35f5bd1563%3A0x6c666571936959!2sAv.%20Paseo%20de%20la%20Reforma%20456%2C%20Ju%C3%A1rez%2C%20Cuauht%C3%A9moc%2C%2006600%20Ciudad%20de%20M%C3%A9xico%2C%20CDMX!5e0!3m2!1ses-419!2smx!4v1700000000000",
};

const UbicacionPublicScreen: React.FC = () => {
  return (
    <div className="ubicacion-publica-wrapper">
      <PublicHeader />

      {/* HERO HEADER */}
      <section className="ubicacion-hero-section">
        <div className="ubicacion-hero-inner">
          <span className="ubicacion-tag">Encuéntranos</span>
          <div className="section-header">
            <h1>Nuestra <span>Ubicación</span></h1>
            <p>
              Visítanos en nuestra boutique exclusiva para vivir una experiencia de joyería personalizada.
            </p>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="page-container">
        <div className="ubicacion-layout">

          {/* MAP */}
          <div className="map-card">
            <div className="map-container">
              <iframe
                title="Mapa Ubicacion"
                src={SUCURSAL.mapaSrc}
                width="100%"
                height="420"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
            </div>
            <div className="map-caption">
              <AiOutlineEnvironment size={18} aria-hidden="true" />
              <span>{SUCURSAL.resumen}</span>
            </div>
          </div>

          {/* INFO SIDEBAR */}
          <aside className="info-sidebar">

            <div className="info-card info-featured">
              <div className="info-card-icon">
                <AiOutlineGift size={20} aria-hidden="true" />
              </div>
              <h3>Diana Laura Boutique</h3>
              <p>Tu destino de joyería exclusiva en el corazón de la ciudad.</p>
            </div>

            <div className="info-card">
              <div className="info-card-icon">
                <span className="pin-animate">
                  <AiOutlineEnvironment size={18} aria-hidden="true" />
                </span>
              </div>
              <h3>Dirección</h3>
              <p>
                {SUCURSAL.calle}<br />
                {SUCURSAL.colonia}<br />
                <strong>{SUCURSAL.ciudad}</strong>
              </p>
            </div>

            <div className="info-card">
              <div className="info-card-icon">
                <AiOutlineClockCircle size={18} aria-hidden="true" />
              </div>
              <h3>Horario de Atención</h3>
              <p>
                {SUCURSAL.horarioDias}<br />
                <strong>{SUCURSAL.horarioHoras}</strong><br />
                {SUCURSAL.horarioCerrado}
              </p>
            </div>

            <div className="info-card">
              <div className="info-card-icon">
                <AiOutlinePhone size={18} aria-hidden="true" />
              </div>
              <h3>Contacto</h3>
              <p>
                <strong>{SUCURSAL.telefono}</strong><br />
                {SUCURSAL.correo}
              </p>
            </div>

          </aside>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default UbicacionPublicScreen;