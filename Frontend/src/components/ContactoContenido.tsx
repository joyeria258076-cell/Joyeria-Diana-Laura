import React, { useEffect, useState } from "react";
import {
  AiOutlineWhatsApp, AiOutlineMail, AiOutlinePhone, AiOutlineEnvironment,
  AiOutlineClockCircle, AiOutlineInstagram, AiOutlineFacebook, AiOutlineQuestionCircle,
} from "react-icons/ai";
import { FaTiktok } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { contentAPI } from "../services/api";
import Seccion from "./Seccion";
import "../styles/SitioSecciones.css";

interface InfoEmpresa {
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  horario?: string | null;
  whatsapp?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
}

// Contenido compartido de "Contáctanos" (público y cliente). El canal principal
// es WhatsApp; los datos salen de Información Empresarial (admin).
const ContactoContenido: React.FC<{ privado?: boolean }> = ({ privado = false }) => {
  const navigate = useNavigate();
  const [info, setInfo] = useState<InfoEmpresa | null>(null);

  useEffect(() => {
    contentAPI.getInfoEmpresa()
      .then(res => { if (res?.data) setInfo(res.data); })
      .catch(() => { /* se muestran solo las secciones con datos */ });
  }, []);

  const wa = info?.whatsapp?.replace(/\D/g, "");
  const mensaje = encodeURIComponent("Hola, me gustaría recibir información sobre sus joyas 💎");
  const redes = [
    { url: info?.instagram_url, icon: <AiOutlineInstagram size={20} />, label: "Instagram" },
    { url: info?.facebook_url,  icon: <AiOutlineFacebook size={20} />,  label: "Facebook" },
    { url: info?.tiktok_url,    icon: <FaTiktok size={16} />,           label: "TikTok" },
  ].filter(r => r.url);

  const tarjetas = [
    info?.telefono && { icon: <AiOutlinePhone size={22} />, titulo: "Teléfono",
      texto: <a href={`tel:${info.telefono.replace(/\s/g, "")}`}>{info.telefono}</a> },
    info?.email && { icon: <AiOutlineMail size={22} />, titulo: "Correo electrónico",
      texto: <a href={`mailto:${info.email}`}>{info.email}</a> },
    info?.direccion && { icon: <AiOutlineEnvironment size={22} />, titulo: "Visítanos", texto: info.direccion },
    info?.horario && { icon: <AiOutlineClockCircle size={22} />, titulo: "Horario de atención", texto: info.horario },
  ].filter(Boolean) as { icon: React.ReactNode; titulo: string; texto: React.ReactNode }[];

  return (
    <div className={`sx-container${privado ? " sx-container--privado" : ""}`}>
      <header className="sx-head">
        <div className="sx-eyebrow">Contacto</div>
        <h1 className="sx-title">Hablemos de tu <span>próxima joya</span></h1>
        <p className="sx-subtitle">
          Escríbenos por WhatsApp y te respondemos en horario de atención: dudas sobre piezas,
          pedidos, apartados o diseños personalizados.
        </p>
      </header>

      <Seccion id="contacto.whatsapp" nombre="Bloque de WhatsApp">
      <section className="sx-feature">
        <div>
          <div className="sx-eyebrow" style={{ justifyContent: "flex-start" }}>Atención directa</div>
          <h2 className="sx-title" style={{ fontSize: "clamp(1.7rem, 3vw, 2.3rem)" }}>
            Te atendemos por <span>WhatsApp</span>
          </h2>
          <p className="sx-card-text">
            Es la forma más rápida de comunicarte con nosotros. Si prefieres, revisa primero
            el centro de ayuda: ahí están las preguntas más frecuentes.
          </p>
        </div>
        <div className="sx-feature-actions">
          {wa ? (
            <a className="sx-btn" href={`https://wa.me/${wa}?text=${mensaje}`} target="_blank" rel="noopener noreferrer">
              <AiOutlineWhatsApp size={18} /> Escribir por WhatsApp
            </a>
          ) : (
            <p className="sx-muted">El número de WhatsApp aún no está configurado.</p>
          )}
          <button className="sx-btn sx-btn--ghost" onClick={() => navigate(privado ? "/ayuda" : "/ayuda-publica")}>
            <AiOutlineQuestionCircle size={18} /> Centro de ayuda
          </button>
        </div>
      </section>
      </Seccion>

      <Seccion id="contacto.datos" nombre="Tarjetas de contacto">
      {tarjetas.length > 0 && (
        <div className="sx-grid">
          {tarjetas.map(t => (
            <div className="sx-card sx-card--center" key={t.titulo}>
              <div className="sx-icon">{t.icon}</div>
              <h3 className="sx-card-title">{t.titulo}</h3>
              <p className="sx-card-text">{t.texto}</p>
            </div>
          ))}
        </div>
      )}
      </Seccion>

      <Seccion id="contacto.redes" nombre="Redes sociales">
      {redes.length > 0 && (
        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          <div className="sx-eyebrow">Síguenos</div>
          <div className="sx-socials">
            {redes.map(r => (
              <a key={r.label} className="sx-social" href={r.url!} target="_blank" rel="noopener noreferrer" aria-label={r.label}>
                {r.icon}
              </a>
            ))}
          </div>
        </div>
      )}
      </Seccion>
    </div>
  );
};

export default ContactoContenido;
