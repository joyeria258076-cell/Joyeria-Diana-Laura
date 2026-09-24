import React, { useEffect, useState } from "react";
import { AiOutlineDown, AiOutlineWhatsApp, AiOutlineMail } from "react-icons/ai";
import ChatBotAyuda from "./ChatBotAyuda";
import Loader from "./Loader";
import { contentAPI } from "../services/api";
import "../styles/SitioSecciones.css";

interface FAQ { id: number; pregunta: string; respuesta: string; orden: number; activa: boolean; }
interface Info { horario?: string | null; direccion?: string | null; email?: string | null; }

// Centro de ayuda compartido (público y cliente): preguntas frecuentes que
// administra el negocio + asistente con salida a WhatsApp.
const AyudaContenido: React.FC<{ privado?: boolean }> = ({ privado = false }) => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    contentAPI.getFaqs()
      .then(res => {
        const arr: FAQ[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setFaqs(arr.filter(f => f.activa));
      })
      .catch(() => { /* lista vacía */ })
      .finally(() => setLoading(false));
    contentAPI.getInfoEmpresa()
      .then(res => {
        if (!res?.data) return;
        setInfo({ horario: res.data.horario, direccion: res.data.direccion, email: res.data.email });
        if (res.data.whatsapp) setWhatsapp(res.data.whatsapp.replace(/\D/g, ""));
      })
      .catch(() => { /* sin datos de contacto */ });
  }, []);

  const mensaje = encodeURIComponent("Hola, soy cliente de Joyería Diana Laura y necesito ayuda 💎");

  return (
    <div className={`sx-container${privado ? " sx-container--privado" : ""}`}>
      <header className="sx-head">
        <div className="sx-eyebrow">Soporte y asistencia</div>
        <h1 className="sx-title">Centro de <span>ayuda</span></h1>
        <p className="sx-subtitle">
          Resolvemos tus dudas para que tu única preocupación sea lucir tus joyas.
        </p>
      </header>

      <div className="sx-layout-aside">
        <section>
          <h2 className="sx-section-title">Preguntas frecuentes</h2>
          {loading ? (
            <Loader tamano="sm" texto="Cargando preguntas..." />
          ) : faqs.length === 0 ? (
            <p className="sx-muted">No hay preguntas frecuentes disponibles por el momento.</p>
          ) : (
            <div className="sx-accordion">
              {faqs.map(f => {
                const abierta = open === f.id;
                return (
                  <div key={f.id} className={`sx-acc-item${abierta ? " sx-acc-item--open" : ""}`}>
                    <button className="sx-acc-btn" aria-expanded={abierta}
                      onClick={() => setOpen(abierta ? null : f.id)}>
                      <span>{f.pregunta}</span>
                      <AiOutlineDown className="sx-acc-icon" size={14} />
                    </button>
                    {abierta && <div className="sx-acc-body">{f.respuesta}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="sx-card sx-card--static sx-sticky">
          <h2 className="sx-card-title" style={{ fontSize: "1.6rem" }}>¿Aún tienes dudas?</h2>
          <p className="sx-card-text">
            Pregúntale al asistente; si no encuentra la respuesta, te pasa con una persona por WhatsApp.
          </p>
          <ChatBotAyuda faqs={faqs} whatsapp={whatsapp} info={info} logeado={privado} />
          {whatsapp && (
            <a className="sx-btn" style={{ width: "100%", boxSizing: "border-box" }}
              href={`https://wa.me/${whatsapp}?text=${mensaje}`} target="_blank" rel="noopener noreferrer">
              <AiOutlineWhatsApp size={18} /> Chatear por WhatsApp
            </a>
          )}
          {info?.email && (
            <p className="sx-muted" style={{ textAlign: "center", marginTop: "1rem" }}>
              <AiOutlineMail style={{ verticalAlign: "-2px", marginRight: 6 }} />
              <a href={`mailto:${info.email}`} style={{ color: "var(--color-champagne)" }}>{info.email}</a>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default AyudaContenido;
