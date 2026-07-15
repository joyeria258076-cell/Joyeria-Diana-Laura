import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { contentAPI } from "../../services/api";
import "./AyudaPublicScreen.css";

interface FAQ {
  id: number;
  pregunta: string;
  respuesta: string;
  orden: number;
  activa: boolean;
}

const Ayuda: React.FC = () => {
  const [faqs, setFaqs]       = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState<number | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await contentAPI.getFaqs();
        const arr: FAQ[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setFaqs(arr.filter(f => f.activa));
      } catch { /* silently fallback */ }
      finally { setLoading(false); }
    };
    cargar();
  }, []);

  const toggle = (id: number) => setOpen(prev => (prev === id ? null : id));

  return (
    <div className="ayuda-publica-wrapper">
      <PublicHeader />

      <section className="ayuda-hero-section">
        <div className="ayuda-hero-inner">
          <span className="ayuda-tag">Soporte & Asistencia</span>
          <div className="section-header">
            <h1>Centro de <span>Ayuda</span></h1>
            <p>Resolvemos tus dudas para que tu única preocupación sea lucir nuestras joyas con elegancia.</p>
          </div>
        </div>
      </section>

      <div className="page-container">
        <div className="faq-grid">

          <section className="faq-section">
            <h2>Preguntas Frecuentes</h2>

            {loading ? (
              <p className="ayuda-faq-loading">Cargando preguntas...</p>
            ) : faqs.length === 0 ? (
              <p className="ayuda-faq-empty">No hay preguntas frecuentes disponibles por el momento.</p>
            ) : (
              <div className="faq-list">
                {faqs.map(f => (
                  <div
                    key={f.id}
                    className={`ayuda-faq-item${open === f.id ? ' ayuda-faq-item--open' : ''}`}
                  >
                    <button className="ayuda-faq-summary" onClick={() => toggle(f.id)}>
                      <span>{f.pregunta}</span>
                      <span className="summary-icon">{open === f.id ? '−' : '+'}</span>
                    </button>
                    {open === f.id && (
                      <p className="faq-answer">{f.respuesta}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

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
