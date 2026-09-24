import React, { useEffect, useState } from "react";
import { AiOutlineEnvironment, AiOutlineClockCircle, AiOutlineCar, AiOutlineWhatsApp } from "react-icons/ai";
import { contentAPI, zonaEntregaAPI } from "../services/api";
import "../styles/SitioSecciones.css";

interface Info { direccion?: string | null; horario?: string | null; whatsapp?: string | null; }

// "Nuestra ubicación" compartida (público y cliente). Dirección y horario
// salen de Información Empresarial; el mapa se genera a partir de la dirección.
const UbicacionContenido: React.FC<{ privado?: boolean }> = ({ privado = false }) => {
  const [info, setInfo] = useState<Info | null>(null);
  const [zonas, setZonas] = useState<string[]>([]);

  useEffect(() => {
    contentAPI.getInfoEmpresa()
      .then(res => { if (res?.data) setInfo(res.data); })
      .catch(() => { /* sin datos */ });
    zonaEntregaAPI.getAll()
      .then((res: any) => {
        const arr = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setZonas(arr.filter((z: any) => z.activo !== false).map((z: any) => z.nombre));
      })
      .catch(() => { /* sin zonas */ });
  }, []);

  const direccion = info?.direccion?.trim();
  const mapaSrc = direccion
    ? `https://maps.google.com/maps?q=${encodeURIComponent(direccion)}&z=16&output=embed`
    : null;
  const comoLlegar = direccion
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}`
    : null;
  const wa = info?.whatsapp?.replace(/\D/g, "");

  return (
    <div className={`sx-container${privado ? " sx-container--privado" : ""}`}>
      <header className="sx-head">
        <div className="sx-eyebrow">Encuéntranos</div>
        <h1 className="sx-title">Nuestra <span>ubicación</span></h1>
        <p className="sx-subtitle">
          Visítanos en sucursal para ver las piezas en persona y recibir atención personalizada.
        </p>
      </header>

      <div className="sx-layout-aside">
        <div className="sx-card sx-card--static" style={{ padding: 0, minHeight: 380 }}>
          {mapaSrc ? (
            <iframe
              title="Mapa de la sucursal"
              src={mapaSrc}
              style={{ border: 0, width: "100%", height: "100%", minHeight: 420, display: "block", filter: "grayscale(0.35) contrast(1.05)" }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <p className="sx-muted" style={{ padding: "2rem", textAlign: "center" }}>
              La dirección de la sucursal aún no está registrada.
            </p>
          )}
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="sx-card sx-card--static">
            <div className="sx-icon"><AiOutlineEnvironment size={22} /></div>
            <h3 className="sx-card-title">Sucursal</h3>
            <p className="sx-card-text">{direccion || "Dirección por confirmar."}</p>
            {comoLlegar && (
              <a className="sx-btn" style={{ marginTop: "1.25rem", width: "100%", boxSizing: "border-box" }}
                href={comoLlegar} target="_blank" rel="noopener noreferrer">
                Cómo llegar
              </a>
            )}
          </div>

          {info?.horario && (
            <div className="sx-card sx-card--static">
              <div className="sx-icon"><AiOutlineClockCircle size={22} /></div>
              <h3 className="sx-card-title">Horario</h3>
              <p className="sx-card-text">{info.horario}</p>
            </div>
          )}

          <div className="sx-card sx-card--static">
            <div className="sx-icon"><AiOutlineCar size={22} /></div>
            <h3 className="sx-card-title">Entregas a domicilio</h3>
            <p className="sx-card-text">
              {zonas.length ? `Entregamos en: ${zonas.join(", ")}.\n` : ""}
              El envío se realiza a través de terceros (transportistas locales, combis y similares).
            </p>
            {wa && (
              <a className="sx-btn sx-btn--ghost" style={{ marginTop: "1.25rem", width: "100%", boxSizing: "border-box" }}
                href={`https://wa.me/${wa}?text=${encodeURIComponent("Hola, ¿hacen entregas en mi zona?")}`}
                target="_blank" rel="noopener noreferrer">
                <AiOutlineWhatsApp size={16} /> Preguntar por mi zona
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default UbicacionContenido;
